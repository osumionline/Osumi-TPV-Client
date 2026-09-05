import type { Signal, WritableSignal } from '@angular/core';
import { computed, Service, signal } from '@angular/core';
import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type ActualizarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/actualizar-cliente-factura-borrador-command.interface';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type {
  ClienteFacturaVentaDisponibleInterface,
  ClienteFacturaVentasDisponiblesConsulta,
} from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';
import type EliminarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/eliminar-cliente-factura-borrador-command.interface';
import type ClienteEstadisticasState from '@model/clientes/cliente-estadisticas-state.interface';
import type ClienteFacturasState from '@model/clientes/cliente-facturas-state.interface';
import createClienteCommand from '@model/clientes/cliente-form-command.mapper';
import createClienteFormInitialValue from '@model/clientes/cliente-form.initial-value';
import createClienteFormModel from '@model/clientes/cliente-form.mapper';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import {
  areClienteFormModelsEqual,
  cloneClienteFormModel,
} from '@model/clientes/cliente-form.utils';
import type ClienteWorkspaceSection from '@model/clientes/cliente-workspace-section.type';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';
import Cliente from '@model/clientes/cliente.model';
import { getErrorMessage } from '@utils/error.utils';

const EMPTY_FACTURAS_STATE: ClienteFacturasState = {
  data: null,
  loading: false,
  error: null,
};

const EMPTY_ESTADISTICAS_STATE: ClienteEstadisticasState = {
  data: null,
  loading: false,
  error: null,
};

const NEW_CLIENT_SECTIONS: ReadonlySet<ClienteWorkspaceSection> = new Set<ClienteWorkspaceSection>([
  'data',
  'billing',
]);

@Service()
export default class ClientesService {
  private readonly clientesSignal: WritableSignal<readonly Cliente[]> = signal<readonly Cliente[]>(
    [],
  );

  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private readonly facturasSignal: WritableSignal<ReadonlyMap<string, ClienteFacturasState>> =
    signal<ReadonlyMap<string, ClienteFacturasState>>(new Map<string, ClienteFacturasState>());
  private readonly estadisticasSignal: WritableSignal<
    ReadonlyMap<string, ClienteEstadisticasState>
  > = signal<ReadonlyMap<string, ClienteEstadisticasState>>(
    new Map<string, ClienteEstadisticasState>(),
  );

  private readonly workspaceSignal: WritableSignal<ClienteWorkspace | null> =
    signal<ClienteWorkspace | null>(null);

  private pendingRequest: Promise<void> | null = null;

  private readonly pendingFacturasRequests: Map<string, Promise<void>> = new Map<
    string,
    Promise<void>
  >();
  private readonly pendingEstadisticasRequests: Map<string, Promise<void>> = new Map<
    string,
    Promise<void>
  >();

  /*
   * Permiten invalidar las peticiones anteriores cuando
   * se limpia completamente el servicio.
   */
  private facturasGeneration: number = 0;
  private estadisticasGeneration: number = 0;

  readonly clientes: Signal<readonly Cliente[]> = this.clientesSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();
  readonly workspace: Signal<ClienteWorkspace | null> = this.workspaceSignal.asReadonly();
  readonly hasWorkspace: Signal<boolean> = computed((): boolean => this.workspace() !== null);

  load(): Promise<void> {
    if (this.loaded()) {
      return Promise.resolve();
    }

    return this.loadData();
  }

  reload(): Promise<void> {
    return this.loadData();
  }

  /**
   * Abre una nueva ficha temporal de cliente.
   *
   * Solo existe un workspace, por lo que cualquier ficha
   * limpia anterior queda sustituida por la nueva.
   */
  crearBorrador(): ClienteWorkspace {
    const draft = createClienteFormInitialValue();
    const workspace: ClienteWorkspace = {
      clienteId: null,
      clientePublicId: null,
      draft,
      baseSnapshot: cloneClienteFormModel(draft),
      dirty: false,
      activeSection: 'data',
    };

    this.workspaceSignal.set(workspace);

    return workspace;
  }

  /**
   * Abre la ficha de un cliente persistido utilizando una copia
   * editable de sus datos actuales.
   */
  abrirFicha(cliente: Cliente): ClienteWorkspace {
    if (cliente.id === null || cliente.publicId === null) {
      throw new Error('No se puede abrir la ficha de un cliente no persistido.');
    }

    const draft = createClienteFormModel(cliente);
    const workspace: ClienteWorkspace = {
      clienteId: cliente.id,
      clientePublicId: cliente.publicId,
      draft,
      baseSnapshot: cloneClienteFormModel(draft),
      dirty: false,
      activeSection: 'data',
    };

    this.workspaceSignal.set(workspace);

    return workspace;
  }

  /**
   * Cambia la sección activa de la ficha abierta.
   */
  seleccionarSeccion(section: ClienteWorkspaceSection): ClienteWorkspace {
    const workspace: ClienteWorkspace | null = this.workspace();

    if (workspace === null) {
      throw new Error('No hay ninguna ficha de cliente abierta.');
    }

    if (workspace.clienteId === null && !NEW_CLIENT_SECTIONS.has(section)) {
      throw new Error('La sección indicada requiere un cliente persistido.');
    }

    if (workspace.activeSection === section) {
      return workspace;
    }

    const updatedWorkspace: ClienteWorkspace = {
      ...workspace,
      activeSection: section,
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Actualiza el modelo editable y recalcula si difiere
   * de la instantánea base de la ficha.
   */
  actualizarDraft(model: ClienteFormModel): ClienteWorkspace {
    const workspace: ClienteWorkspace | null = this.workspace();

    if (workspace === null) {
      throw new Error('No hay ninguna ficha de cliente abierta.');
    }

    const draft: ClienteFormModel = cloneClienteFormModel(model);
    const updatedWorkspace: ClienteWorkspace = {
      ...workspace,
      draft,
      dirty: !areClienteFormModelsEqual(draft, workspace.baseSnapshot),
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Restaura la instantánea base de la ficha abierta.
   */
  cancelarCambios(): ClienteWorkspace {
    const workspace: ClienteWorkspace | null = this.workspace();

    if (workspace === null) {
      throw new Error('No hay ninguna ficha de cliente abierta.');
    }

    const updatedWorkspace: ClienteWorkspace = {
      ...workspace,
      draft: cloneClienteFormModel(workspace.baseSnapshot),
      dirty: false,
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Cierra la ficha actualmente abierta.
   *
   * La confirmación para descartar cambios pertenece a la página.
   */
  cerrarFicha(): void {
    this.workspaceSignal.set(null);
  }

  /**
   * Crea o actualiza la ficha abierta y adopta como nuevo snapshot
   * la versión canónica devuelta por backend.
   */
  async guardar(): Promise<ClienteWorkspace> {
    const workspace: ClienteWorkspace | null = this.workspace();

    if (workspace === null) {
      throw new Error('No hay ninguna ficha de cliente abierta.');
    }

    if ((workspace.clienteId === null) !== (workspace.clientePublicId === null)) {
      throw new Error('La ficha de cliente contiene una identidad incoherente.');
    }

    const createCommand: CrearClienteCommand = createClienteCommand(workspace.draft);
    let cliente: Cliente;

    if (workspace.clientePublicId === null) {
      cliente = await this.create(createCommand);
    } else {
      const updateCommand: ActualizarClienteCommand = {
        ...createCommand,
        publicId: workspace.clientePublicId,
      };

      cliente = await this.update(updateCommand);
    }

    return this.reemplazarWorkspaceTrasGuardado(workspace, cliente);
  }

  /**
   * Crea un cliente y reconcilia la respuesta confirmada por backend.
   */
  async create(command: CrearClienteCommand): Promise<Cliente> {
    const createdCliente: ClienteInterface = await window.osumiDesktop.clientes.create(command);

    return this.reconciliarClientePersistido(createdCliente);
  }

  /**
   * Actualiza un cliente y reconcilia la respuesta confirmada por backend.
   */
  async update(command: ActualizarClienteCommand): Promise<Cliente> {
    const updatedCliente: ClienteInterface = await window.osumiDesktop.clientes.update(command);

    return this.reconciliarClientePersistido(updatedCliente);
  }

  /**
   * Da de baja el cliente persistido de la ficha abierta y
   * reconcilia el estado local después del COMMIT.
   */
  async darDeBaja(): Promise<void> {
    const workspace: ClienteWorkspace | null = this.workspace();

    if (workspace === null || workspace.clienteId === null || workspace.clientePublicId === null) {
      throw new Error('Solo se puede dar de baja un cliente ya guardado.');
    }

    if (workspace.dirty) {
      throw new Error('Guarda o cancela los cambios antes de dar de baja el cliente.');
    }

    const publicId: string = workspace.clientePublicId;

    await window.osumiDesktop.clientes.deactivate(publicId);

    /*
     * Una lectura global iniciada antes de la baja podría terminar
     * después y volver a introducir el cliente en la colección.
     */
    if (this.pendingRequest !== null) {
      try {
        await this.pendingRequest;
      } catch {
        /*
         * La baja ya está confirmada. El fallo de una lectura
         * anterior no debe convertir el COMMIT en un error.
         */
      }
    }

    await Promise.all([this.invalidateFacturas(publicId), this.invalidateEstadisticas(publicId)]);

    this.clientesSignal.update((clientes: readonly Cliente[]): readonly Cliente[] =>
      clientes.filter((cliente: Cliente): boolean => cliente.publicId !== publicId),
    );

    if (this.workspace()?.clientePublicId === publicId) {
      this.workspaceSignal.set(null);
    }
  }

  /**
   * Solicita las estadísticas generales de la ficha de un cliente.
   *
   * La gestión de carga y respuestas antiguas pertenece al
   * componente que consume estos datos.
   */
  getEstadisticasGenerales(publicId: string): Promise<ClienteEstadisticasGeneralesInterface> {
    return window.osumiDesktop.clientes.getEstadisticasGenerales(publicId);
  }

  /**
   * Solicita la serie temporal de consumo mensual
   * correspondiente a los filtros indicados.
   */
  getConsumoMensual(
    consulta: ClienteConsumoMensualConsulta,
  ): Promise<ClienteConsumoMensualResultado> {
    return window.osumiDesktop.clientes.getConsumoMensual(consulta);
  }

  /**
   * Crea un borrador y reconcilia en la caché
   * la factura confirmada por el backend.
   */
  async createFacturaBorrador(
    command: CrearClienteFacturaBorradorCommand,
  ): Promise<ClienteFacturaInterface> {
    const factura: ClienteFacturaInterface =
      await window.osumiDesktop.clientes.createFacturaBorrador(command);

    await this.reconciliarFacturaPersistida(command.clientePublicId, factura);

    return factura;
  }

  /**
   * Actualiza un borrador y reconcilia en la caché
   * la factura confirmada por el backend.
   */
  async updateFacturaBorrador(
    command: ActualizarClienteFacturaBorradorCommand,
  ): Promise<ClienteFacturaInterface> {
    const factura: ClienteFacturaInterface =
      await window.osumiDesktop.clientes.updateFacturaBorrador(command);

    await this.reconciliarFacturaPersistida(command.clientePublicId, factura);

    return factura;
  }

  /**
   * Elimina un borrador confirmado por el backend
   * y lo retira de la caché del cliente.
   */
  async deleteFacturaBorrador(command: EliminarClienteFacturaBorradorCommand): Promise<void> {
    await window.osumiDesktop.clientes.deleteFacturaBorrador(command);

    await this.reconciliarFacturaEliminada(command.clientePublicId, command.borradorPublicId);
  }

  /**
   * Solicita una instantánea actual de las ventas
   * disponibles para crear o editar una factura.
   *
   * Esta consulta no se cachea porque la disponibilidad
   * puede cambiar después de cualquier operación de facturación.
   */
  getFacturaVentasDisponibles(
    consulta: ClienteFacturaVentasDisponiblesConsulta,
  ): Promise<readonly ClienteFacturaVentaDisponibleInterface[]> {
    return window.osumiDesktop.clientes.getFacturaVentasDisponibles(consulta);
  }

  /**
   * Devuelve el estado reactivo cacheado de las facturas
   * de un cliente.
   */
  getFacturasState(publicId: string | null): ClienteFacturasState {
    if (publicId === null) {
      return EMPTY_FACTURAS_STATE;
    }

    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      return EMPTY_FACTURAS_STATE;
    }

    return this.facturasSignal().get(normalizedPublicId) ?? EMPTY_FACTURAS_STATE;
  }

  /**
   * Carga las facturas de un cliente únicamente cuando
   * todavía no están disponibles en caché.
   */
  loadFacturas(publicId: string): Promise<void> {
    return this.loadFacturasData(publicId, false);
  }

  /**
   * Fuerza la actualización de las facturas cacheadas.
   */
  reloadFacturas(publicId: string): Promise<void> {
    return this.loadFacturasData(publicId, true);
  }

  /**
   * Invalida las facturas cacheadas de un cliente.
   *
   * Espera cualquier consulta anterior para evitar que una
   * respuesta iniciada antes de una escritura repueble la caché.
   */
  async invalidateFacturas(publicId: string): Promise<void> {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      throw new Error('El identificador del cliente no es válido.');
    }

    const pendingRequest: Promise<void> | undefined =
      this.pendingFacturasRequests.get(normalizedPublicId);

    if (pendingRequest !== undefined) {
      await pendingRequest;
    }

    const facturas: Map<string, ClienteFacturasState> = new Map<string, ClienteFacturasState>(
      this.facturasSignal(),
    );

    facturas.delete(normalizedPublicId);

    this.facturasSignal.set(facturas);
  }

  /**
   * Devuelve el estado reactivo cacheado de las estadísticas
   * de un cliente.
   */
  getEstadisticasState(publicId: string | null): ClienteEstadisticasState {
    if (publicId === null) {
      return EMPTY_ESTADISTICAS_STATE;
    }

    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      return EMPTY_ESTADISTICAS_STATE;
    }

    return this.estadisticasSignal().get(normalizedPublicId) ?? EMPTY_ESTADISTICAS_STATE;
  }

  /**
   * Carga las estadísticas de un cliente únicamente cuando
   * todavía no están disponibles en caché.
   */
  loadEstadisticas(publicId: string): Promise<void> {
    return this.loadEstadisticasData(publicId, false);
  }

  /**
   * Fuerza la actualización de unas estadísticas ya cacheadas.
   */
  reloadEstadisticas(publicId: string): Promise<void> {
    return this.loadEstadisticasData(publicId, true);
  }

  /**
   * Invalida las estadísticas cacheadas de un cliente.
   *
   * Si existe una consulta anterior todavía en curso, esperamos
   * a que termine antes de eliminar su resultado para impedir
   * que una respuesta iniciada antes del COMMIT repueble la
   * caché con datos desactualizados.
   */
  async invalidateEstadisticas(publicId: string): Promise<void> {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      throw new Error('El identificador del cliente no es válido.');
    }

    const pendingRequest: Promise<void> | undefined =
      this.pendingEstadisticasRequests.get(normalizedPublicId);

    if (pendingRequest !== undefined) {
      await pendingRequest;
    }

    const estadisticas: Map<string, ClienteEstadisticasState> = new Map<
      string,
      ClienteEstadisticasState
    >(this.estadisticasSignal());

    estadisticas.delete(normalizedPublicId);

    this.estadisticasSignal.set(estadisticas);
  }

  clear(): void {
    this.clientesSignal.set([]);
    this.loadedSignal.set(false);
    this.facturasSignal.set(new Map<string, ClienteFacturasState>());
    this.estadisticasSignal.set(new Map<string, ClienteEstadisticasState>());
    this.workspaceSignal.set(null);

    /*
     * Las peticiones antiguas pueden seguir físicamente en curso,
     * pero sus respuestas ya no podrán modificar el nuevo estado.
     */
    this.facturasGeneration += 1;
    this.estadisticasGeneration += 1;

    this.pendingFacturasRequests.clear();
    this.pendingEstadisticasRequests.clear();
  }

  findById(id: number): Cliente | null {
    return this.clientes().find((cliente: Cliente): boolean => cliente.id === id) ?? null;
  }

  findByPublicId(publicId: string): Cliente | null {
    return (
      this.clientes().find((cliente: Cliente): boolean => cliente.publicId === publicId) ?? null
    );
  }

  /**
   * Incorpora a la colección la versión canónica devuelta después
   * de un CREATE o UPDATE confirmado por backend.
   *
   * Cuando el cliente ya existe se conserva su instancia para que
   * cualquier venta en curso que la referencie reciba también los
   * datos actualizados.
   */
  private async reconciliarClientePersistido(persistedCliente: ClienteInterface): Promise<Cliente> {
    /*
     * Una lectura iniciada antes de la escritura todavía podría
     * terminar después y sobrescribir la colección con datos antiguos.
     *
     * Esperamos a que finalice antes de incorporar la respuesta
     * confirmada. Si aquella lectura falla, la escritura sigue siendo
     * válida porque su COMMIT ya ha sido confirmado.
     */
    if (this.pendingRequest !== null) {
      try {
        await this.pendingRequest;
      } catch {
        /*
         * La respuesta recibida confirma que el COMMIT ya terminó.
         * Un fallo de una lectura anterior no debe convertirlo en error.
         */
      }
    }

    const cliente: Cliente = (
      this.findByPublicId(persistedCliente.publicId) ?? new Cliente()
    ).fromInterface(persistedCliente);

    this.clientesSignal.update((clientes: readonly Cliente[]): readonly Cliente[] =>
      [
        ...clientes.filter((item: Cliente): boolean => item.publicId !== persistedCliente.publicId),
        cliente,
      ].sort((left: Cliente, right: Cliente): number => {
        const nameComparison: number = left.nombreApellidos.localeCompare(
          right.nombreApellidos,
          'es',
          {
            sensitivity: 'base',
          },
        );

        if (nameComparison !== 0) {
          return nameComparison;
        }

        return (left.id ?? 0) - (right.id ?? 0);
      }),
    );

    this.loadedSignal.set(true);

    return cliente;
  }

  /**
   * Sustituye el draft y el snapshot por la versión canónica persistida,
   * conservando la sección que el usuario estaba consultando.
   */
  private reemplazarWorkspaceTrasGuardado(
    workspace: ClienteWorkspace,
    cliente: Cliente,
  ): ClienteWorkspace {
    if (cliente.id === null || cliente.publicId === null) {
      throw new Error('El cliente guardado no contiene una identidad válida.');
    }

    const draft: ClienteFormModel = createClienteFormModel(cliente);
    const updatedWorkspace: ClienteWorkspace = {
      clienteId: cliente.id,
      clientePublicId: cliente.publicId,
      draft,
      baseSnapshot: cloneClienteFormModel(draft),
      dirty: false,
      activeSection: workspace.activeSection,
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestClientes();

    return this.pendingRequest;
  }

  private async requestClientes(): Promise<void> {
    try {
      const result: readonly ClienteInterface[] = await window.osumiDesktop.clientes.getAll();

      const clientes: readonly Cliente[] = result.map((cliente: ClienteInterface): Cliente =>
        new Cliente().fromInterface(cliente),
      );

      this.clientesSignal.set(clientes);

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }

  /**
   * Espera una lectura anterior de facturas sin permitir
   * que su fallo invalide una escritura ya confirmada.
   */
  private async waitPendingFacturaRequest(publicId: string): Promise<void> {
    const pendingRequest: Promise<void> | undefined = this.pendingFacturasRequests.get(publicId);

    if (pendingRequest === undefined) {
      return;
    }

    try {
      await pendingRequest;
    } catch {
      /*
       * La escritura ya está confirmada. El fallo de una lectura
       * anterior no debe convertir el COMMIT en un error.
       */
    }
  }

  /**
   * Añade o sustituye una factura confirmada conservando
   * el orden anterior de las facturas ya existentes.
   */
  private async reconciliarFacturaPersistida(
    clientePublicId: string,
    factura: ClienteFacturaInterface,
  ): Promise<void> {
    const normalizedPublicId: string = clientePublicId.trim();

    await this.waitPendingFacturaRequest(normalizedPublicId);

    const currentState: ClienteFacturasState = this.getFacturasState(normalizedPublicId);
    let data: readonly ClienteFacturaInterface[] | null = currentState.data;

    if (data !== null) {
      const facturaIndex: number = data.findIndex(
        (item: ClienteFacturaInterface): boolean => item.publicId === factura.publicId,
      );

      data =
        facturaIndex === -1
          ? [factura, ...data]
          : data.map((item: ClienteFacturaInterface): ClienteFacturaInterface =>
              item.publicId === factura.publicId ? factura : item,
            );
    }

    this.setFacturasState(normalizedPublicId, {
      data,
      loading: false,
      error: null,
    });
  }

  /**
   * Retira una factura eliminada de la caché sin construir
   * una colección parcial si todavía no estaba cargada.
   */
  private async reconciliarFacturaEliminada(
    clientePublicId: string,
    borradorPublicId: string,
  ): Promise<void> {
    const normalizedPublicId: string = clientePublicId.trim();
    const normalizedBorradorPublicId: string = borradorPublicId.trim();

    await this.waitPendingFacturaRequest(normalizedPublicId);

    const currentState: ClienteFacturasState = this.getFacturasState(normalizedPublicId);
    const data: readonly ClienteFacturaInterface[] | null =
      currentState.data === null
        ? null
        : currentState.data.filter(
            (factura: ClienteFacturaInterface): boolean =>
              factura.publicId !== normalizedBorradorPublicId,
          );

    this.setFacturasState(normalizedPublicId, {
      data,
      loading: false,
      error: null,
    });
  }

  /**
   * Coordina la caché y las peticiones simultáneas de facturas.
   */
  private loadFacturasData(publicId: string, force: boolean): Promise<void> {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      throw new Error('El identificador del cliente no es válido.');
    }

    const cachedState: ClienteFacturasState | undefined =
      this.facturasSignal().get(normalizedPublicId);

    if (!force && cachedState?.data !== null && cachedState?.data !== undefined) {
      return Promise.resolve();
    }

    const pendingRequest: Promise<void> | undefined =
      this.pendingFacturasRequests.get(normalizedPublicId);

    if (pendingRequest !== undefined) {
      return pendingRequest;
    }

    const generation: number = this.facturasGeneration;
    const request: Promise<void> = this.requestFacturas(normalizedPublicId, generation);

    this.pendingFacturasRequests.set(normalizedPublicId, request);

    void request.finally((): void => {
      if (this.pendingFacturasRequests.get(normalizedPublicId) === request) {
        this.pendingFacturasRequests.delete(normalizedPublicId);
      }
    });

    return request;
  }

  /**
   * Consulta las facturas y actualiza su estado reactivo.
   */
  private async requestFacturas(publicId: string, generation: number): Promise<void> {
    const currentState: ClienteFacturasState = this.getFacturasState(publicId);

    this.setFacturasState(publicId, {
      data: currentState.data,
      loading: true,
      error: null,
    });

    try {
      const result: readonly ClienteFacturaInterface[] =
        await window.osumiDesktop.clientes.getFacturas(publicId);

      if (generation !== this.facturasGeneration) {
        return;
      }

      this.setFacturasState(publicId, {
        data: result,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      if (generation !== this.facturasGeneration) {
        return;
      }

      this.setFacturasState(publicId, {
        data: currentState.data,
        loading: false,
        error: getErrorMessage(error, 'No se han podido cargar las facturas del cliente.'),
      });
    }
  }

  /**
   * Sustituye el estado cacheado de las facturas de un cliente.
   */
  private setFacturasState(publicId: string, state: ClienteFacturasState): void {
    const facturas: Map<string, ClienteFacturasState> = new Map<string, ClienteFacturasState>(
      this.facturasSignal(),
    );

    facturas.set(publicId, state);

    this.facturasSignal.set(facturas);
  }

  private loadEstadisticasData(publicId: string, force: boolean): Promise<void> {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      throw new Error('El identificador del cliente no es válido.');
    }

    const cachedState: ClienteEstadisticasState | undefined =
      this.estadisticasSignal().get(normalizedPublicId);

    if (!force && cachedState?.data !== null && cachedState?.data !== undefined) {
      return Promise.resolve();
    }

    const pendingRequest: Promise<void> | undefined =
      this.pendingEstadisticasRequests.get(normalizedPublicId);

    if (pendingRequest !== undefined) {
      return pendingRequest;
    }

    const generation: number = this.estadisticasGeneration;

    const request: Promise<void> = this.requestEstadisticas(normalizedPublicId, generation);

    this.pendingEstadisticasRequests.set(normalizedPublicId, request);

    /*
     * La comparación de la Promise es importante: si clear()
     * invalida esta petición y posteriormente se inicia otra para
     * el mismo cliente, la petición antigua no debe borrar la nueva
     * del mapa cuando termine.
     */
    void request.finally((): void => {
      if (this.pendingEstadisticasRequests.get(normalizedPublicId) === request) {
        this.pendingEstadisticasRequests.delete(normalizedPublicId);
      }
    });

    return request;
  }

  private async requestEstadisticas(publicId: string, generation: number): Promise<void> {
    const currentState: ClienteEstadisticasState = this.getEstadisticasState(publicId);

    this.setEstadisticasState(publicId, {
      data: currentState.data,
      loading: true,
      error: null,
    });

    try {
      const result: ClienteEstadisticasInterface =
        await window.osumiDesktop.clientes.getEstadisticas(publicId);

      if (generation !== this.estadisticasGeneration) {
        return;
      }

      this.setEstadisticasState(publicId, {
        data: result,
        loading: false,
        error: null,
      });
    } catch (error: unknown) {
      if (generation !== this.estadisticasGeneration) {
        return;
      }

      this.setEstadisticasState(publicId, {
        data: currentState.data,
        loading: false,
        error: getErrorMessage(error, 'No se han podido cargar las estadísticas del cliente.'),
      });
    }
  }

  private setEstadisticasState(publicId: string, state: ClienteEstadisticasState): void {
    const estadisticas: Map<string, ClienteEstadisticasState> = new Map<
      string,
      ClienteEstadisticasState
    >(this.estadisticasSignal());

    estadisticas.set(publicId, state);

    this.estadisticasSignal.set(estadisticas);
  }
}
