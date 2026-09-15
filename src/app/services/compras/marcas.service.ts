import { type Signal, type WritableSignal, computed, inject, Service, signal } from '@angular/core';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import type ActualizarMarcaCommand from '@desktop-contracts/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type MarcaLogoUpdateCommand from '@desktop-contracts/marcas/marca-logo-update-command.type';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import type MarcaEstadisticasFiltros from '@model/marcas/marca-estadisticas-filtros.interface';
import {
  createMarcaEstadisticasFiltrosIniciales,
  normalizeMarcaEstadisticasFiltros,
} from '@model/marcas/marca-estadisticas-filtros.utils';
import createMarcaFormInitialValue from '@model/marcas/marca-form.initial-value';
import createMarcaFormModel from '@model/marcas/marca-form.mapper';
import type MarcaFormModel from '@model/marcas/marca-form.model';
import { areMarcaFormModelsEqual, cloneMarcaFormModel } from '@model/marcas/marca-form.utils';
import type MarcaWorkspaceSection from '@model/marcas/marca-workspace-section.type';
import type MarcaWorkspace from '@model/marcas/marca-workspace.interface';
import Marca from '@model/marcas/marca.model';
import FilesService from '@services/application/files.service';

type MarcaPersistableCommand = Omit<ActualizarMarcaCommand, 'logo'>;

@Service()
export default class MarcasService {
  private readonly filesService: FilesService = inject(FilesService);

  private readonly marcasSignal: WritableSignal<readonly Marca[]> = signal<readonly Marca[]>([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly workspaceSignal: WritableSignal<MarcaWorkspace | null> =
    signal<MarcaWorkspace | null>(null);
  private readonly focusNameRequestSignal: WritableSignal<number> = signal<number>(0);
  private readonly savingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly logoProcessingSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly deactivatingSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly marcas: Signal<readonly Marca[]> = this.marcasSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();
  readonly workspace: Signal<MarcaWorkspace | null> = this.workspaceSignal.asReadonly();
  readonly focusNameRequest: Signal<number> = this.focusNameRequestSignal.asReadonly();
  readonly saving: Signal<boolean> = this.savingSignal.asReadonly();
  readonly deactivating: Signal<boolean> = this.deactivatingSignal.asReadonly();

  readonly processing: Signal<boolean> = computed(
    (): boolean => this.saving() || this.logoProcessingSignal() || this.deactivating(),
  );

  readonly hasWorkspace: Signal<boolean> = computed((): boolean => this.workspace() !== null);
  readonly dirty: Signal<boolean> = computed((): boolean => {
    const workspace: MarcaWorkspace | null = this.workspace();

    return workspace !== null && !areMarcaFormModelsEqual(workspace.draft, workspace.baseSnapshot);
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
   * Abre una nueva ficha temporal de Marca.
   */
  crearBorrador(): MarcaWorkspace {
    const draft: MarcaFormModel = createMarcaFormInitialValue();

    const workspace: MarcaWorkspace = {
      marcaId: null,
      marcaPublicId: null,
      draft,
      baseSnapshot: cloneMarcaFormModel(draft),
      logoStagingId: null,
      activeSection: 'data',
      estadisticasFiltros: createMarcaEstadisticasFiltrosIniciales(),
    };

    this.workspaceSignal.set(workspace);
    this.focusNameRequestSignal.update((request: number): number => request + 1);

    return workspace;
  }

  /**
   * Abre la ficha de una Marca persistida utilizando
   * una copia editable de sus datos actuales.
   */
  abrirFicha(marca: Marca): MarcaWorkspace {
    if (marca.id === null || marca.publicId === null) {
      throw new Error('No se puede abrir la ficha de una marca no persistida.');
    }

    const draft: MarcaFormModel = createMarcaFormModel(marca);

    const workspace: MarcaWorkspace = {
      marcaId: marca.id,
      marcaPublicId: marca.publicId,
      draft,
      baseSnapshot: cloneMarcaFormModel(draft),
      logoStagingId: null,
      activeSection: 'data',
      estadisticasFiltros: createMarcaEstadisticasFiltrosIniciales(),
    };

    this.workspaceSignal.set(workspace);
    this.focusNameRequestSignal.update((request: number): number => request + 1);

    return workspace;
  }

  /**
   * Cambia la sección activa de la ficha de Marca.
   */
  seleccionarSeccion(section: MarcaWorkspaceSection): MarcaWorkspace {
    const workspace: MarcaWorkspace = this.requireWorkspace();

    if (workspace.marcaId === null && section === 'statistics') {
      throw new Error('Las estadísticas requieren una marca persistida.');
    }

    if (workspace.activeSection === section) {
      return workspace;
    }

    const updatedWorkspace: MarcaWorkspace = {
      ...workspace,
      activeSection: section,
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Actualiza el draft editable de la ficha abierta.
   */
  actualizarDraft(model: MarcaFormModel): MarcaWorkspace {
    const workspace: MarcaWorkspace = this.requireWorkspace();

    const updatedWorkspace: MarcaWorkspace = {
      ...workspace,
      draft: cloneMarcaFormModel(model),
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Prepara un nuevo logo temporal para la ficha
   * y sustituye de forma segura cualquier staging anterior.
   */
  async seleccionarLogo(file: File): Promise<MarcaWorkspace> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de marca en curso.');
    }

    const workspace: MarcaWorkspace = this.requireWorkspace();

    this.logoProcessingSignal.set(true);

    try {
      const stagedImage: StagedImageInterface = await this.filesService.stageBrandImage(file);

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

      const updatedWorkspace: MarcaWorkspace = {
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
   * staging temporal que estuviera asociado a él.
   */
  async quitarLogo(): Promise<MarcaWorkspace> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de marca en curso.');
    }

    const workspace: MarcaWorkspace = this.requireWorkspace();

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

    const updatedWorkspace: MarcaWorkspace = {
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
   * Restaura el draft a la instantánea base y elimina
   * cualquier logo temporal todavía no persistido.
   */
  async cancelarCambios(): Promise<MarcaWorkspace> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de marca en curso.');
    }

    const workspace: MarcaWorkspace = this.requireWorkspace();

    if (workspace.logoStagingId !== null) {
      this.logoProcessingSignal.set(true);

      try {
        await this.filesService.discardStagedImage(workspace.logoStagingId);
      } finally {
        this.logoProcessingSignal.set(false);
      }
    }

    const updatedWorkspace: MarcaWorkspace = {
      ...workspace,
      logoStagingId: null,
      draft: cloneMarcaFormModel(workspace.baseSnapshot),
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Actualiza y normaliza los filtros estadísticos
   * conservados en el workspace de Marca.
   */
  actualizarFiltrosEstadisticas(filters: MarcaEstadisticasFiltros): MarcaWorkspace {
    const workspace: MarcaWorkspace = this.requireWorkspace();

    if (workspace.marcaId === null) {
      throw new Error('Las estadísticas requieren una marca persistida.');
    }

    const updatedWorkspace: MarcaWorkspace = {
      ...workspace,
      estadisticasFiltros: normalizeMarcaEstadisticasFiltros(filters),
    };

    this.workspaceSignal.set(updatedWorkspace);

    return updatedWorkspace;
  }

  /**
   * Cierra la ficha actual eliminando antes cualquier
   * logo temporal que todavía no haya sido persistido.
   */
  async cerrarFicha(): Promise<void> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de marca en curso.');
    }

    const workspace: MarcaWorkspace | null = this.workspace();

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
   * Persiste el workspace actual y lo reconcilia
   * con la Marca canónica devuelta por el backend.
   */
  async saveWorkspace(): Promise<Marca> {
    if (this.processing()) {
      throw new Error('Ya hay un guardado de marca en curso.');
    }

    const workspace: MarcaWorkspace = this.requireWorkspace();

    const command: MarcaPersistableCommand = this.createPersistableCommand(workspace.draft);

    this.savingSignal.set(true);

    try {
      let marca: Marca;

      if (workspace.marcaId === null) {
        const createCommand: CrearMarcaCommand =
          workspace.logoStagingId === null
            ? {
                ...command,
                crearProveedor: false,
              }
            : {
                ...command,
                crearProveedor: false,
                logoStagingId: workspace.logoStagingId,
              };

        marca = await this.create(createCommand);
      } else {
        const logo: MarcaLogoUpdateCommand | undefined = this.createLogoUpdateCommand(workspace);

        const updateCommand: ActualizarMarcaCommand =
          logo === undefined
            ? command
            : {
                ...command,
                logo,
              };

        marca = await this.update(workspace.marcaId, updateCommand);
      }

      if (marca.id === null || marca.publicId === null) {
        throw new Error('La marca guardada no contiene una identidad válida.');
      }

      const persistedModel: MarcaFormModel = createMarcaFormModel(marca);

      const updatedWorkspace: MarcaWorkspace = {
        ...workspace,
        marcaId: marca.id,
        marcaPublicId: marca.publicId,
        logoStagingId: null,
        draft: cloneMarcaFormModel(persistedModel),
        baseSnapshot: cloneMarcaFormModel(persistedModel),
      };

      this.workspaceSignal.set(updatedWorkspace);

      return marca;
    } finally {
      this.savingSignal.set(false);
    }
  }

  /**
   * Da de baja la Marca del workspace actual,
   * elimina su staging temporal si existe y cierra la ficha.
   */
  async deactivateWorkspace(): Promise<void> {
    if (this.processing()) {
      throw new Error('Ya hay una operación de marca en curso.');
    }

    const workspace: MarcaWorkspace = this.requireWorkspace();

    if (workspace.marcaId === null) {
      throw new Error('No se puede eliminar una marca que todavía no se ha guardado.');
    }

    this.deactivatingSignal.set(true);

    try {
      await this.deactivate(workspace.marcaId);

      this.workspaceSignal.set(null);

      if (workspace.logoStagingId !== null) {
        await Promise.allSettled([this.filesService.discardStagedImage(workspace.logoStagingId)]);
      }
    } finally {
      this.deactivatingSignal.set(false);
    }
  }

  /**
   * Crea una marca, refresca la colección global
   * y devuelve su instancia canónica.
   */
  async create(command: CrearMarcaCommand): Promise<Marca> {
    const createdMarca: MarcaInterface = await window.osumiDesktop.marcas.create(command);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const marca: Marca = new Marca().fromInterface(createdMarca);

    this.upsertMarca(marca);
    this.loadedSignal.set(true);

    return marca;
  }

  /**
   * Actualiza una Marca persistida, refresca la
   * colección global y devuelve su instancia canónica.
   */
  async update(id: number, command: ActualizarMarcaCommand): Promise<Marca> {
    const updatedMarca: MarcaInterface = await window.osumiDesktop.marcas.update(id, command);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const marca: Marca = new Marca().fromInterface(updatedMarca);

    this.upsertMarca(marca);
    this.loadedSignal.set(true);

    return marca;
  }

  /**
   * Da de baja una Marca activa y la elimina
   * inmediatamente del maestro renderer.
   */
  async deactivate(id: number): Promise<void> {
    await window.osumiDesktop.marcas.deactivate(id);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    this.marcasSignal.update((marcas: readonly Marca[]): readonly Marca[] =>
      marcas.filter((marca: Marca): boolean => marca.id !== id),
    );
  }

  /**
   * Limpia el maestro y cualquier workspace de Marca
   * conservado en la sesión.
   */
  clear(): void {
    this.marcasSignal.set([]);
    this.loadedSignal.set(false);
    this.workspaceSignal.set(null);
    this.focusNameRequestSignal.set(0);
    this.savingSignal.set(false);
    this.logoProcessingSignal.set(false);
    this.deactivatingSignal.set(false);
  }

  findById(id: number): Marca | null {
    return this.marcas().find((marca: Marca): boolean => marca.id === id) ?? null;
  }

  findByPublicId(publicId: string): Marca | null {
    return this.marcas().find((marca: Marca): boolean => marca.publicId === publicId) ?? null;
  }

  /**
   * Determina la modificación de logo necesaria
   * para una Marca ya persistida.
   */
  private createLogoUpdateCommand(workspace: MarcaWorkspace): MarcaLogoUpdateCommand | undefined {
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

    throw new Error('El estado editable del logo de la marca no es coherente.');
  }

  /**
   * Construye los datos textuales persistibles
   * desde el draft editable de una Marca.
   */
  private createPersistableCommand(model: MarcaFormModel): MarcaPersistableCommand {
    return {
      nombre: model.nombre.trim(),
      telefono: this.normalizeOptionalText(model.telefono),
      email: this.normalizeOptionalText(model.email),
      direccion: this.normalizeOptionalText(model.direccion),
      web: this.normalizeOptionalText(model.web),
      observaciones: this.normalizeOptionalText(model.observaciones),
    };
  }

  /**
   * Convierte un texto opcional vacío en null
   * y normaliza los espacios exteriores.
   */
  private normalizeOptionalText(value: string): string | null {
    const normalizedValue: string = value.trim();

    return normalizedValue === '' ? null : normalizedValue;
  }

  /**
   * Inserta o sustituye una Marca canónica
   * en el maestro global manteniendo su orden.
   */
  private upsertMarca(marca: Marca): void {
    this.marcasSignal.update((marcas: readonly Marca[]): readonly Marca[] =>
      [...marcas.filter((item: Marca): boolean => item.publicId !== marca.publicId), marca].sort(
        (left: Marca, right: Marca): number =>
          left.nombre.localeCompare(right.nombre, 'es', {
            sensitivity: 'base',
          }),
      ),
    );
  }

  /**
   * Devuelve el workspace abierto o impide operar
   * cuando todavía no existe ninguna ficha de Marca.
   */
  private requireWorkspace(): MarcaWorkspace {
    const workspace: MarcaWorkspace | null = this.workspace();

    if (workspace === null) {
      throw new Error('No hay ninguna ficha de marca abierta.');
    }

    return workspace;
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestMarcas();

    return this.pendingRequest;
  }

  private async requestMarcas(): Promise<void> {
    try {
      const result: readonly MarcaInterface[] = await window.osumiDesktop.marcas.getAll();

      const marcas: readonly Marca[] = result.map((marca: MarcaInterface): Marca =>
        new Marca().fromInterface(marca),
      );

      this.marcasSignal.set(marcas);

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }
}
