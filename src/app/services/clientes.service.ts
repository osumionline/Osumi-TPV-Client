import type { Signal, WritableSignal } from '@angular/core';
import { computed, Service, signal } from '@angular/core';
import type { ClienteEstadisticasInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type ClienteEstadisticasState from '@model/clientes/cliente-estadisticas-state.interface';
import createClienteFormInitialValue from '@model/clientes/cliente-form.initial-value';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';
import Cliente from '@model/clientes/cliente.model';
import { getErrorMessage } from '@utils/error.utils';

const EMPTY_ESTADISTICAS_STATE: ClienteEstadisticasState = {
  data: null,
  loading: false,
  error: null,
};

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
      baseSnapshot: {
        ...draft,
      },
      dirty: false,
      activeSection: 'data',
    };

    this.workspaceSignal.set(workspace);

    return workspace;
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
   * Crea un cliente, recarga la colección global y devuelve
   * la instancia canónica incorporada al servicio.
   */
  async create(command: CrearClienteCommand): Promise<Cliente> {
    const createdCliente: ClienteInterface = await window.osumiDesktop.clientes.create(command);

    /*
     * Si existiese una lectura anterior todavía en curso, esperamos
     * a que termine antes de forzar nuestra recarga posterior.
     *
     * De esta manera evitamos que reload() reutilice una petición
     * iniciada antes de crear el cliente y que, por tanto, pudiera
     * no contener todavía el nuevo registro.
     */
    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    await this.reload();

    const cliente: Cliente | null = this.findByPublicId(createdCliente.publicId);

    if (cliente === null) {
      throw new Error(
        'El cliente se ha creado, pero no se ha podido recuperar después de actualizar la lista.',
      );
    }

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
