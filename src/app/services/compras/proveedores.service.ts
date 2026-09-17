import { computed, inject, Service, signal, type Signal, type WritableSignal } from '@angular/core';
import type ActualizarComercialCommand from '@desktop-contracts/compras/proveedores/actualizar-comercial-command.interface';
import type ActualizarProveedorCommand from '@desktop-contracts/compras/proveedores/actualizar-proveedor-command.interface';
import type CrearComercialCommand from '@desktop-contracts/compras/proveedores/crear-comercial-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/compras/proveedores/crear-proveedor-command.interface';
import type ProveedorLogoUpdateCommand from '@desktop-contracts/compras/proveedores/proveedor-logo-update-command.type';
import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/compras/proveedores/proveedor.interface';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
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
import FilesService from '@services/application/files.service';

type ProveedorPersistableCommand = Omit<ActualizarProveedorCommand, 'logo'>;

@Service()
export default class ProveedoresService {
  private readonly filesService: FilesService = inject(FilesService);

  private readonly focusNameRequestSignal: WritableSignal<number> = signal<number>(0);
  private readonly savingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly logoProcessingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly deactivatingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly proveedoresSignal: WritableSignal<readonly Proveedor[]> = signal<
    readonly Proveedor[]
  >([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly workspaceSignal: WritableSignal<ProveedorWorkspace | null> =
    signal<ProveedorWorkspace | null>(null);
  private readonly comercialSavingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly comercialDeactivatingSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly proveedores: Signal<readonly Proveedor[]> = this.proveedoresSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();
  readonly workspace: Signal<ProveedorWorkspace | null> = this.workspaceSignal.asReadonly();
  readonly focusNameRequest: Signal<number> = this.focusNameRequestSignal.asReadonly();
  readonly saving: Signal<boolean> = this.savingSignal.asReadonly();
  readonly deactivating: Signal<boolean> = this.deactivatingSignal.asReadonly();
  readonly comercialSaving: Signal<boolean> = this.comercialSavingSignal.asReadonly();
  readonly comercialDeactivating: Signal<boolean> = this.comercialDeactivatingSignal.asReadonly();

  readonly processing: Signal<boolean> = computed(
    (): boolean =>
      this.saving() ||
      this.logoProcessingSignal() ||
      this.deactivating() ||
      this.comercialSaving() ||
      this.comercialDeactivating(),
  );

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

  readonly workspaceProveedor: Signal<Proveedor | null> = computed((): Proveedor | null => {
    const workspace: ProveedorWorkspace | null = this.workspace();

    if (workspace === null || workspace.proveedorId === null) {
      return null;
    }

    return (
      this.proveedores().find(
        (proveedor: Proveedor): boolean => proveedor.id === workspace.proveedorId,
      ) ?? null
    );
  });

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

    this.focusNameRequestSignal.update((request: number): number => request + 1);

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

    this.focusNameRequestSignal.update((request: number): number => request + 1);

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
   * Prepara un nuevo logo temporal y sustituye
   * de forma segura cualquier staging anterior.
   */
  async seleccionarLogo(file: File): Promise<ProveedorWorkspace> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de proveedor en curso.');
    }

    const workspace: ProveedorWorkspace = this.requireWorkspace();

    this.logoProcessingSignal.set(true);

    try {
      const stagedImage: StagedImageInterface = await this.filesService.stageProviderImage(file);

      if (workspace.logoStagingId !== null) {
        try {
          await this.filesService.discardStagedImage(workspace.logoStagingId);
        } catch (discardError: unknown) {
          try {
            await this.filesService.discardStagedImage(stagedImage.stagingId);
          } catch (cleanupError: unknown) {
            throw new AggregateError(
              [discardError, cleanupError],
              'No se han podido limpiar correctamente los logos temporales.',
              {
                cause: cleanupError,
              },
            );
          }

          throw discardError;
        }
      }

      const updatedWorkspace: ProveedorWorkspace = {
        ...workspace,
        logoStagingId: stagedImage.stagingId,
        draft: {
          ...workspace.draft,
          foto: stagedImage.url,
        },
      };

      this.workspaceSignal.set(updatedWorkspace);

      return updatedWorkspace;
    } finally {
      this.logoProcessingSignal.set(false);
    }
  }

  /**
   * Quita el logo del draft y elimina cualquier
   * staging temporal asociado.
   */
  async quitarLogo(): Promise<ProveedorWorkspace> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de proveedor en curso.');
    }

    const workspace: ProveedorWorkspace = this.requireWorkspace();

    if (workspace.draft.foto === null && workspace.logoStagingId === null) {
      return workspace;
    }

    if (workspace.logoStagingId !== null) {
      this.logoProcessingSignal.set(true);

      try {
        await this.filesService.discardStagedImage(workspace.logoStagingId);
      } finally {
        this.logoProcessingSignal.set(false);
      }
    }

    const updatedWorkspace: ProveedorWorkspace = {
      ...workspace,
      logoStagingId: null,
      draft: {
        ...workspace.draft,
        foto: null,
      },
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
   * base y elimina cualquier logo temporal.
   *
   * El Comercial activo es independiente.
   */
  async cancelarCambios(): Promise<ProveedorWorkspace> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de proveedor en curso.');
    }

    const workspace: ProveedorWorkspace = this.requireWorkspace();

    if (workspace.logoStagingId !== null) {
      this.logoProcessingSignal.set(true);

      try {
        await this.filesService.discardStagedImage(workspace.logoStagingId);
      } finally {
        this.logoProcessingSignal.set(false);
      }
    }

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
   * Persiste el Comercial actualmente abierto
   * y reconcilia inmediatamente el Proveedor canónico.
   */
  async saveComercialWorkspace(): Promise<Comercial> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de proveedor en curso.');
    }

    const workspace = this.requirePersistedWorkspace();

    const comercialWorkspace: ProveedorComercialWorkspace =
      this.requireComercialWorkspace(workspace);

    const proveedor: Proveedor = this.requireCanonicalWorkspaceProveedor(workspace);

    const command: CrearComercialCommand = this.createComercialPersistableCommand(
      comercialWorkspace.draft,
    );

    this.comercialSavingSignal.set(true);

    try {
      let persistedInterface: ComercialInterface;

      if (comercialWorkspace.state === 'new') {
        persistedInterface = await window.osumiDesktop.proveedores.createComercial(
          workspace.proveedorId,
          command,
        );
      } else {
        if (comercialWorkspace.comercialId === null) {
          throw new Error('El Comercial persistido no contiene un identificador válido.');
        }

        const updateCommand: ActualizarComercialCommand = command;

        persistedInterface = await window.osumiDesktop.proveedores.updateComercial(
          workspace.proveedorId,
          comercialWorkspace.comercialId,
          updateCommand,
        );
      }

      if (this.pendingRequest !== null) {
        await this.pendingRequest;
      }

      const comercial: Comercial = new Comercial().fromInterface(persistedInterface);

      this.upsertComercial(proveedor, comercial);

      const persistedModel: ComercialFormModel = createComercialFormModel(comercial);

      const currentWorkspace: ProveedorWorkspace = this.requirePersistedWorkspace();

      this.workspaceSignal.set({
        ...currentWorkspace,
        activeSection: 'commercials',
        comercialWorkspace: {
          comercialId: comercial.id,
          comercialPublicId: comercial.publicId,
          state: 'existing',
          draft: cloneComercialFormModel(persistedModel),
          baseSnapshot: cloneComercialFormModel(persistedModel),
        },
      });

      return comercial;
    } finally {
      this.comercialSavingSignal.set(false);
    }
  }

  /**
   * Da de baja el Comercial persistido abierto,
   * actualiza el Proveedor canónico y cierra su editor.
   */
  async deactivateComercialWorkspace(): Promise<void> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de proveedor en curso.');
    }

    const workspace = this.requirePersistedWorkspace();

    const comercialWorkspace: ProveedorComercialWorkspace =
      this.requireComercialWorkspace(workspace);

    if (comercialWorkspace.state !== 'existing' || comercialWorkspace.comercialId === null) {
      throw new Error('No se puede eliminar un Comercial que todavía no se ha guardado.');
    }

    const proveedor: Proveedor = this.requireCanonicalWorkspaceProveedor(workspace);

    this.comercialDeactivatingSignal.set(true);

    try {
      await window.osumiDesktop.proveedores.deactivateComercial(
        workspace.proveedorId,
        comercialWorkspace.comercialId,
      );

      if (this.pendingRequest !== null) {
        await this.pendingRequest;
      }

      this.removeComercial(proveedor, comercialWorkspace.comercialId);

      const currentWorkspace: ProveedorWorkspace = this.requirePersistedWorkspace();

      this.workspaceSignal.set({
        ...currentWorkspace,
        comercialWorkspace: null,
      });
    } finally {
      this.comercialDeactivatingSignal.set(false);
    }
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
   * Cierra la ficha actual eliminando antes
   * cualquier logo temporal no persistido.
   */
  async cerrarFicha(): Promise<void> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de proveedor en curso.');
    }

    const workspace: ProveedorWorkspace | null = this.workspace();

    if (workspace === null) {
      return;
    }

    if (workspace.logoStagingId !== null) {
      this.logoProcessingSignal.set(true);

      try {
        await this.filesService.discardStagedImage(workspace.logoStagingId);
      } finally {
        this.logoProcessingSignal.set(false);
      }
    }

    this.workspaceSignal.set(null);
  }

  /**
   * Persiste el workspace principal y lo
   * reconcilia con el Proveedor canónico.
   */
  async saveWorkspace(): Promise<Proveedor> {
    if (this.processing()) {
      throw new Error('Ya hay un guardado de proveedor en curso.');
    }

    const workspace: ProveedorWorkspace = this.requireWorkspace();

    const command: ProveedorPersistableCommand = this.createPersistableCommand(workspace.draft);

    this.savingSignal.set(true);

    try {
      let proveedor: Proveedor;

      if (workspace.proveedorId === null) {
        const createCommand: CrearProveedorCommand =
          workspace.logoStagingId === null
            ? command
            : {
                ...command,
                logoStagingId: workspace.logoStagingId,
              };

        proveedor = await this.create(createCommand);
      } else {
        const logo: ProveedorLogoUpdateCommand | undefined =
          this.createLogoUpdateCommand(workspace);

        const updateCommand: ActualizarProveedorCommand =
          logo === undefined
            ? command
            : {
                ...command,
                logo,
              };

        proveedor = await this.update(workspace.proveedorId, updateCommand);
      }

      if (proveedor.id === null || proveedor.publicId === null) {
        throw new Error('El proveedor guardado no contiene una identidad válida.');
      }

      const persistedModel: ProveedorFormModel = createProveedorFormModel(proveedor);

      const updatedWorkspace: ProveedorWorkspace = {
        ...workspace,
        proveedorId: proveedor.id,
        proveedorPublicId: proveedor.publicId,
        logoStagingId: null,
        draft: cloneProveedorFormModel(persistedModel),
        baseSnapshot: cloneProveedorFormModel(persistedModel),
      };

      this.workspaceSignal.set(updatedWorkspace);

      return proveedor;
    } finally {
      this.savingSignal.set(false);
    }
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
    this.focusNameRequestSignal.set(0);
    this.savingSignal.set(false);
    this.logoProcessingSignal.set(false);
    this.deactivatingSignal.set(false);
    this.comercialSavingSignal.set(false);
    this.comercialDeactivatingSignal.set(false);
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
   * Da de baja el Proveedor del workspace,
   * elimina su staging pendiente y cierra la ficha.
   */
  async deactivateWorkspace(): Promise<void> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de proveedor en curso.');
    }

    const workspace: ProveedorWorkspace = this.requireWorkspace();

    if (workspace.proveedorId === null) {
      throw new Error('No se puede eliminar un proveedor que todavía no se ha guardado.');
    }

    this.deactivatingSignal.set(true);

    try {
      await this.deactivate(workspace.proveedorId);

      this.workspaceSignal.set(null);

      if (workspace.logoStagingId !== null) {
        await Promise.allSettled([this.filesService.discardStagedImage(workspace.logoStagingId)]);
      }
    } finally {
      this.deactivatingSignal.set(false);
    }
  }

  /**
   * Determina la modificación de logo necesaria
   * para un Proveedor persistido.
   */
  private createLogoUpdateCommand(
    workspace: ProveedorWorkspace,
  ): ProveedorLogoUpdateCommand | undefined {
    if (workspace.logoStagingId !== null) {
      return {
        action: 'replace',
        stagingId: workspace.logoStagingId,
      };
    }

    if (workspace.draft.foto === workspace.baseSnapshot.foto) {
      return undefined;
    }

    if (workspace.draft.foto === null && workspace.baseSnapshot.foto !== null) {
      return {
        action: 'remove',
      };
    }

    throw new Error('El estado editable del logo del proveedor no es coherente.');
  }

  /**
   * Construye los datos persistibles
   * desde el draft del Proveedor.
   */
  private createPersistableCommand(model: ProveedorFormModel): ProveedorPersistableCommand {
    return {
      nombre: model.nombre.trim(),
      telefono: this.normalizeOptionalText(model.telefono),
      email: this.normalizeOptionalText(model.email),
      direccion: this.normalizeOptionalText(model.direccion),
      web: this.normalizeOptionalText(model.web),
      observaciones: this.normalizeOptionalText(model.observaciones),
      idsMarcas: [...new Set(model.marcas)],
    };
  }

  /**
   * Convierte un texto opcional vacío en null
   * y elimina espacios exteriores.
   */
  private normalizeOptionalText(value: string): string | null {
    const normalizedValue: string = value.trim();

    return normalizedValue === '' ? null : normalizedValue;
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
  private requirePersistedWorkspace(): ProveedorWorkspace & {
    readonly proveedorId: number;
    readonly proveedorPublicId: string;
  } {
    const workspace: ProveedorWorkspace = this.requireWorkspace();

    if (workspace.proveedorId === null || workspace.proveedorPublicId === null) {
      throw new Error('La operación requiere un proveedor persistido.');
    }

    return workspace as ProveedorWorkspace & {
      readonly proveedorId: number;
      readonly proveedorPublicId: string;
    };
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

  /**
   * Construye los datos persistibles
   * desde el draft de Comercial.
   */
  private createComercialPersistableCommand(model: ComercialFormModel): CrearComercialCommand {
    return {
      nombre: model.nombre.trim(),
      telefono: this.normalizeOptionalText(model.telefono),
      email: this.normalizeOptionalText(model.email),
      observaciones: this.normalizeOptionalText(model.observaciones),
    };
  }

  /**
   * Recupera el Proveedor canónico asociado al
   * workspace antes de ejecutar un CRUD de Comercial.
   */
  private requireCanonicalWorkspaceProveedor(workspace: ProveedorWorkspace): Proveedor {
    if (workspace.proveedorId === null) {
      throw new Error('La operación requiere un proveedor persistido.');
    }

    const proveedor: Proveedor | null = this.findById(workspace.proveedorId);

    if (proveedor === null) {
      throw new Error('El proveedor abierto no existe en el maestro activo.');
    }

    return proveedor;
  }

  /**
   * Inserta o sustituye un Comercial dentro del
   * Proveedor canónico sin realizar ninguna recarga.
   */
  private upsertComercial(proveedorBase: Proveedor, comercial: Comercial): void {
    const proveedor: Proveedor =
      proveedorBase.id === null
        ? proveedorBase
        : (this.findById(proveedorBase.id) ?? proveedorBase);

    const comerciales: Comercial[] = [
      ...proveedor.comerciales.filter(
        (item: Comercial): boolean => item.publicId !== comercial.publicId,
      ),
      comercial,
    ].sort((left: Comercial, right: Comercial): number =>
      left.nombre.localeCompare(right.nombre, 'es', {
        sensitivity: 'base',
      }),
    );

    const updatedProveedor: Proveedor = new Proveedor().fromInterface({
      ...proveedor.toInterface(),
      comerciales: comerciales.map((item: Comercial): ComercialInterface => item.toInterface()),
    });

    this.upsertProveedor(updatedProveedor);
  }

  /**
   * Elimina un Comercial del Proveedor canónico
   * después de confirmar su soft-delete.
   */
  private removeComercial(proveedorBase: Proveedor, idComercial: number): void {
    const proveedor: Proveedor =
      proveedorBase.id === null
        ? proveedorBase
        : (this.findById(proveedorBase.id) ?? proveedorBase);

    const updatedProveedor: Proveedor = new Proveedor().fromInterface({
      ...proveedor.toInterface(),
      comerciales: proveedor.comerciales
        .filter((comercial: Comercial): boolean => comercial.id !== idComercial)
        .map((comercial: Comercial): ComercialInterface => comercial.toInterface()),
    });

    this.upsertProveedor(updatedProveedor);
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
