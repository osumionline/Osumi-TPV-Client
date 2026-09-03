import type { Signal, WritableSignal } from '@angular/core';
import { computed, Service, signal } from '@angular/core';
import type { ClienteEstadisticasInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type ClienteEstadisticasState from '@model/clientes/cliente-estadisticas-state.interface';
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

  private readonly estadisticasSignal: WritableSignal<
    ReadonlyMap<string, ClienteEstadisticasState>
  > = signal<ReadonlyMap<string, ClienteEstadisticasState>>(
    new Map<string, ClienteEstadisticasState>(),
  );
  private readonly workspaceSignal: WritableSignal<ClienteWorkspace | null> =
    signal<ClienteWorkspace | null>(null);

  private pendingRequest: Promise<void> | null = null;

  private readonly pendingEstadisticasRequests: Map<string, Promise<void>> = new Map<
    string,
    Promise<void>
  >();

  /*
   * Permite invalidar de golpe cualquier petición de estadísticas
   * anterior cuando se limpia completamente el servicio.
   */
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
   * Persiste el borrador de un cliente nuevo y adopta como nuevo
   * snapshot la versión canónica devuelta por backend.
   */
  async guardar(): Promise<ClienteWorkspace> {
    const workspace: ClienteWorkspace | null = this.workspace();

    if (workspace === null) {
      throw new Error('No hay ninguna ficha de cliente abierta.');
    }

    if (workspace.clienteId !== null) {
      throw new Error('La actualización de clientes todavía no está disponible.');
    }

    const cliente: Cliente = await this.create(createClienteCommand(workspace.draft));

    return this.reemplazarWorkspaceTrasGuardado(workspace, cliente);
  }

  /**
   * Crea un cliente y lo reconcilia en la colección global
   * después de cualquier carga anterior todavía pendiente.
   */
  async create(command: CrearClienteCommand): Promise<Cliente> {
    const createdCliente: ClienteInterface = await window.osumiDesktop.clientes.create(command);

    /*
     * Una lectura iniciada antes de la creación todavía podría
     * terminar después y sobrescribir la colección con datos antiguos.
     *
     * Esperamos a que finalice antes de incorporar la respuesta
     * confirmada de create. Si aquella lectura falla, el alta sigue
     * siendo válida porque su COMMIT ya ha sido confirmado.
     */
    if (this.pendingRequest !== null) {
      try {
        await this.pendingRequest;
      } catch {
        /*
         * La respuesta de create confirma que el COMMIT ya terminó.
         * Un fallo de una lectura anterior no debe convertirlo en error.
         */
      }
    }

    const cliente: Cliente = new Cliente().fromInterface(createdCliente);

    this.clientesSignal.update((clientes: readonly Cliente[]): readonly Cliente[] =>
      [
        ...clientes.filter((item: Cliente): boolean => item.publicId !== createdCliente.publicId),
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
    this.estadisticasSignal.set(new Map<string, ClienteEstadisticasState>());
    this.workspaceSignal.set(null);

    /*
     * Una petición antigua puede seguir físicamente en curso,
     * pero su respuesta ya no podrá modificar el nuevo estado.
     */
    this.estadisticasGeneration += 1;

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
