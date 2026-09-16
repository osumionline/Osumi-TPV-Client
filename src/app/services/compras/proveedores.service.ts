import { computed, Service, signal, type Signal, type WritableSignal } from '@angular/core';
import type ActualizarProveedorCommand from '@desktop-contracts/proveedores/actualizar-proveedor-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';
import createComercialFormInitialValue from '@model/proveedores/comercial-form.initial-value';
import createComercialFormModel from '@model/proveedores/comercial-form.mapper';
import type ComercialFormModel from '@model/proveedores/comercial-form.model';
import {
  areComercialFormModelsEqual,
  cloneComercialFormModel,
} from '@model/proveedores/comercial-form.utils';
import Comercial from '@model/proveedores/comercial.model';
import type ProveedorComercialWorkspace from '@model/proveedores/proveedor-comercial-workspace.interface';
import createProveedorFormInitialValue from '@model/proveedores/proveedor-form.initial-value';
import createProveedorFormModel from '@model/proveedores/proveedor-form.mapper';
import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';
import {
  areProveedorFormModelsEqual,
  cloneProveedorFormModel,
} from '@model/proveedores/proveedor-form.utils';
import type ProveedorWorkspaceSection from '@model/proveedores/proveedor-workspace-section.type';
import type ProveedorWorkspace from '@model/proveedores/proveedor-workspace.interface';
import Proveedor from '@model/proveedores/proveedor.model';

@Service()
export default class ProveedoresService {
  private readonly proveedoresSignal: WritableSignal<readonly Proveedor[]> = signal<
    readonly Proveedor[]
  >([]);

  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private readonly workspaceSignal: WritableSignal<ProveedorWorkspace | null> =
    signal<ProveedorWorkspace | null>(null);

  private pendingRequest: Promise<void> | null = null;

  readonly proveedores: Signal<readonly Proveedor[]> = this.proveedoresSignal.asReadonly();

  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

  readonly workspace: Signal<ProveedorWorkspace | null> = this.workspaceSignal.asReadonly();

  readonly hasWorkspace: Signal<boolean> = computed((): boolean => this.workspace() !== null);

  readonly dirty: Signal<boolean> = computed((): boolean => {
    const workspace: ProveedorWorkspace | null = this.workspace();

    return (
      workspace !== null &&
      (workspace.logoStagingId !== null ||
        !areProveedorFormModelsEqual(workspace.draft, workspace.baseSnapshot))
    );
  });

  readonly comercialDirty: Signal<boolean> = computed((): boolean => {
    const comercialWorkspace: ProveedorComercialWorkspace | null =
      this.workspace()?.comercialWorkspace ?? null;

    return (
      comercialWorkspace !== null &&
      !areComercialFormModelsEqual(comercialWorkspace.draft, comercialWorkspace.baseSnapshot)
    );
  });

  readonly hasUnsavedChanges: Signal<boolean> = computed(
    (): boolean => this.dirty() || this.comercialDirty(),
  );

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
   * Abre una ficha temporal para crear
   * un Proveedor todavía no persistido.
   */
  crearBorrador(): ProveedorWorkspace {
    const draft: ProveedorFormModel = createProveedorFormInitialValue();

    const workspace: ProveedorWorkspace = {
      proveedorId: null,
      proveedorPublicId: null,
      draft,
      baseSnapshot: cloneProveedorFormModel(draft),
      logoStagingId: null,
      activeSection: 'data',
      comercialWorkspace: null,
    };

    this.workspaceSignal.set(workspace);

    return workspace;
  }

  /**
   * Abre la ficha de un Proveedor persistido
   * utilizando una copia editable de sus datos.
   */
  abrirFicha(proveedor: Proveedor): ProveedorWorkspace {
    if (proveedor.id === null || proveedor.publicId === null) {
      throw new Error('No se puede abrir la ficha de un proveedor no persistido.');
    }

    const draft: ProveedorFormModel = createProveedorFormModel(proveedor);

    const workspace: ProveedorWorkspace = {
      proveedorId: proveedor.id,
      proveedorPublicId: proveedor.publicId,
      draft,
      baseSnapshot: cloneProveedorFormModel(draft),
      logoStagingId: null,
      activeSection: 'data',
      comercialWorkspace: null,
    };

    this.workspaceSignal.set(workspace);

    return workspace;
  }

  /**
   * Cambia la sección activa de la ficha.
   *
   * Marcas y Comerciales requieren que el
   * Proveedor ya tenga identidad persistida.
   */
  seleccionarSeccion(section: ProveedorWorkspaceSection): ProveedorWorkspace {
    const workspace: ProveedorWorkspace = this.requireWorkspace();

    if (workspace.proveedorId === null && section !== 'data') {
      throw new Error('Las secciones Marcas y Comerciales requieren un proveedor persistido.');
    }

    if (workspace.activeSection === section) {
      return workspace;
    }

    const updatedWorkspace: ProveedorWorkspace = {
      ...workspace,
      activeSection: section,
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Sustituye el draft principal del Proveedor
   * por una copia independiente del modelo recibido.
   */
  actualizarDraft(model: ProveedorFormModel): ProveedorWorkspace {
    const workspace: ProveedorWorkspace = this.requireWorkspace();

    const updatedWorkspace: ProveedorWorkspace = {
      ...workspace,
      draft: cloneProveedorFormModel(model),
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Restaura Datos y Marcas a la instantánea
   * base del Proveedor.
   *
   * El Comercial activo es independiente y no
   * se modifica mediante esta operación.
   */
  cancelarCambios(): ProveedorWorkspace {
    const workspace: ProveedorWorkspace = this.requireWorkspace();

    const updatedWorkspace: ProveedorWorkspace = {
      ...workspace,
      logoStagingId: null,
      draft: cloneProveedorFormModel(workspace.baseSnapshot),
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Prepara el workspace local de un Comercial
   * nuevo perteneciente al Proveedor abierto.
   */
  crearBorradorComercial(): ProveedorComercialWorkspace {
    const workspace: ProveedorWorkspace = this.requirePersistedWorkspace();

    const draft: ComercialFormModel = createComercialFormInitialValue();

    const comercialWorkspace: ProveedorComercialWorkspace = {
      comercialId: null,
      comercialPublicId: null,
      state: 'new',
      draft,
      baseSnapshot: cloneComercialFormModel(draft),
    };

    this.workspaceSignal.set({
      ...workspace,
      activeSection: 'commercials',
      comercialWorkspace,
    });

    return comercialWorkspace;
  }

  /**
   * Abre un Comercial persistido que pertenezca
   * al Proveedor actualmente abierto.
   */
  abrirComercial(comercial: Comercial): ProveedorComercialWorkspace {
    const workspace: ProveedorWorkspace = this.requirePersistedWorkspace();

    if (comercial.id === null || comercial.publicId === null || comercial.idProveedor === null) {
      throw new Error('No se puede abrir un comercial no persistido.');
    }

    if (comercial.idProveedor !== workspace.proveedorId) {
      throw new Error('El comercial indicado no pertenece al proveedor abierto.');
    }

    const draft: ComercialFormModel = createComercialFormModel(comercial);

    const comercialWorkspace: ProveedorComercialWorkspace = {
      comercialId: comercial.id,
      comercialPublicId: comercial.publicId,
      state: 'existing',
      draft,
      baseSnapshot: cloneComercialFormModel(draft),
    };

    this.workspaceSignal.set({
      ...workspace,
      activeSection: 'commercials',
      comercialWorkspace,
    });

    return comercialWorkspace;
  }

  /**
   * Sustituye el draft editable del Comercial
   * actualmente seleccionado.
   */
  actualizarComercialDraft(model: ComercialFormModel): ProveedorComercialWorkspace {
    const workspace: ProveedorWorkspace = this.requireWorkspace();

    const comercialWorkspace: ProveedorComercialWorkspace =
      this.requireComercialWorkspace(workspace);

    const updatedComercialWorkspace: ProveedorComercialWorkspace = {
      ...comercialWorkspace,
      draft: cloneComercialFormModel(model),
    };

    this.workspaceSignal.set({
      ...workspace,
      comercialWorkspace: updatedComercialWorkspace,
    });

    return updatedComercialWorkspace;
  }

  /**
   * Restaura únicamente el Comercial activo a
   * su propia instantánea base.
   */
  cancelarCambiosComercial(): ProveedorComercialWorkspace {
    const workspace: ProveedorWorkspace = this.requireWorkspace();

    const comercialWorkspace: ProveedorComercialWorkspace =
      this.requireComercialWorkspace(workspace);

    const updatedComercialWorkspace: ProveedorComercialWorkspace = {
      ...comercialWorkspace,
      draft: cloneComercialFormModel(comercialWorkspace.baseSnapshot),
    };

    this.workspaceSignal.set({
      ...workspace,
      comercialWorkspace: updatedComercialWorkspace,
    });

    return updatedComercialWorkspace;
  }

  /**
   * Cierra únicamente el workspace local
   * del Comercial seleccionado.
   */
  cerrarComercial(): void {
    const workspace: ProveedorWorkspace = this.requireWorkspace();

    this.workspaceSignal.set({
      ...workspace,
      comercialWorkspace: null,
    });
  }

  /**
   * Cierra completamente la ficha del
   * Proveedor actualmente abierto.
   */
  cerrarFicha(): void {
    this.workspaceSignal.set(null);
  }

  /**
   * Crea un proveedor, reconcilia el maestro global
   * y devuelve su instancia canónica.
   */
  async create(command: CrearProveedorCommand): Promise<Proveedor> {
    const createdProveedor: ProveedorInterface =
      await window.osumiDesktop.proveedores.create(command);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const proveedor: Proveedor = new Proveedor().fromInterface(createdProveedor);

    this.upsertProveedor(proveedor);
    this.loadedSignal.set(true);

    return proveedor;
  }

  /**
   * Actualiza un proveedor persistido, reconcilia el
   * maestro global y devuelve su instancia canónica.
   */
  async update(id: number, command: ActualizarProveedorCommand): Promise<Proveedor> {
    const updatedProveedor: ProveedorInterface = await window.osumiDesktop.proveedores.update(
      id,
      command,
    );

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const proveedor: Proveedor = new Proveedor().fromInterface(updatedProveedor);

    this.upsertProveedor(proveedor);
    this.loadedSignal.set(true);

    return proveedor;
  }

  /**
   * Da de baja un proveedor activo y lo elimina
   * inmediatamente del maestro renderer.
   */
  async deactivate(id: number): Promise<void> {
    await window.osumiDesktop.proveedores.deactivate(id);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    this.proveedoresSignal.update((proveedores: readonly Proveedor[]): readonly Proveedor[] =>
      proveedores.filter((proveedor: Proveedor): boolean => proveedor.id !== id),
    );
  }

  /**
   * Limpia completamente el maestro y el
   * workspace de Proveedores.
   */
  clear(): void {
    this.proveedoresSignal.set([]);
    this.loadedSignal.set(false);
    this.workspaceSignal.set(null);
  }

  findById(id: number): Proveedor | null {
    return this.proveedores().find((proveedor: Proveedor): boolean => proveedor.id === id) ?? null;
  }

  findByPublicId(publicId: string): Proveedor | null {
    return (
      this.proveedores().find((proveedor: Proveedor): boolean => proveedor.publicId === publicId) ??
      null
    );
  }

  /**
   * Inserta o sustituye un Proveedor canónico en
   * el maestro global manteniendo el orden alfabético.
   */
  private upsertProveedor(proveedor: Proveedor): void {
    this.proveedoresSignal.update((proveedores: readonly Proveedor[]): readonly Proveedor[] =>
      [
        ...proveedores.filter((item: Proveedor): boolean => item.publicId !== proveedor.publicId),
        proveedor,
      ].sort((left: Proveedor, right: Proveedor): number =>
        left.nombre.localeCompare(right.nombre, 'es', {
          sensitivity: 'base',
        }),
      ),
    );
  }

  /**
   * Obtiene el workspace abierto o impide operar
   * cuando todavía no existe ninguna ficha.
   */
  private requireWorkspace(): ProveedorWorkspace {
    const workspace: ProveedorWorkspace | null = this.workspace();

    if (workspace === null) {
      throw new Error('No hay ninguna ficha de proveedor abierta.');
    }

    return workspace;
  }

  /**
   * Obtiene el workspace garantizando que el
   * Proveedor ya dispone de identidad persistida.
   */
  private requirePersistedWorkspace(): ProveedorWorkspace {
    const workspace: ProveedorWorkspace = this.requireWorkspace();

    if (workspace.proveedorId === null || workspace.proveedorPublicId === null) {
      throw new Error('La operación requiere un proveedor persistido.');
    }

    return workspace;
  }

  /**
   * Obtiene el Comercial activo o impide operar
   * cuando todavía no se ha seleccionado ninguno.
   */
  private requireComercialWorkspace(workspace: ProveedorWorkspace): ProveedorComercialWorkspace {
    if (workspace.comercialWorkspace === null) {
      throw new Error('No hay ningún comercial abierto.');
    }

    return workspace.comercialWorkspace;
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestProveedores();

    return this.pendingRequest;
  }

  private async requestProveedores(): Promise<void> {
    try {
      const result: readonly ProveedorInterface[] = await window.osumiDesktop.proveedores.getAll();

      const proveedores: readonly Proveedor[] = result.map(
        (proveedor: ProveedorInterface): Proveedor => new Proveedor().fromInterface(proveedor),
      );

      this.proveedoresSignal.set(proveedores);

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }
}
