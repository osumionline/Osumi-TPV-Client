import { type Signal, type WritableSignal, computed, Service, signal } from '@angular/core';
import type ActualizarMarcaCommand from '@desktop-contracts/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
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

type MarcaPersistableCommand = Omit<ActualizarMarcaCommand, 'logo'>;

@Service()
export default class MarcasService {
  private readonly marcasSignal: WritableSignal<readonly Marca[]> = signal<readonly Marca[]>([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly workspaceSignal: WritableSignal<MarcaWorkspace | null> =
    signal<MarcaWorkspace | null>(null);
  private readonly focusNameRequestSignal: WritableSignal<number> = signal<number>(0);
  private readonly savingSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly marcas: Signal<readonly Marca[]> = this.marcasSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();
  readonly workspace: Signal<MarcaWorkspace | null> = this.workspaceSignal.asReadonly();
  readonly focusNameRequest: Signal<number> = this.focusNameRequestSignal.asReadonly();
  readonly saving: Signal<boolean> = this.savingSignal.asReadonly();

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
   * Restaura el draft a la instantánea base de la ficha.
   */
  cancelarCambios(): MarcaWorkspace {
    const workspace: MarcaWorkspace = this.requireWorkspace();

    const updatedWorkspace: MarcaWorkspace = {
      ...workspace,
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
   * Cierra la ficha de Marca actualmente abierta.
   */
  cerrarFicha(): void {
    this.workspaceSignal.set(null);
  }

  /**
   * Persiste el workspace actual y lo reconcilia
   * con la Marca canónica devuelta por el backend.
   */
  async saveWorkspace(): Promise<Marca> {
    if (this.saving()) {
      throw new Error('Ya hay un guardado de marca en curso.');
    }

    const workspace: MarcaWorkspace = this.requireWorkspace();

    const command: MarcaPersistableCommand = this.createPersistableCommand(workspace.draft);

    this.savingSignal.set(true);

    try {
      const marca: Marca =
        workspace.marcaId === null
          ? await this.create({
              ...command,
              crearProveedor: false,
            })
          : await this.update(workspace.marcaId, command);

      if (marca.id === null || marca.publicId === null) {
        throw new Error('La marca guardada no contiene una identidad válida.');
      }

      const persistedModel: MarcaFormModel = createMarcaFormModel(marca);

      const updatedWorkspace: MarcaWorkspace = {
        ...workspace,
        marcaId: marca.id,
        marcaPublicId: marca.publicId,
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
   * Limpia el maestro y cualquier workspace de Marca
   * conservado en la sesión.
   */
  clear(): void {
    this.marcasSignal.set([]);
    this.loadedSignal.set(false);
    this.workspaceSignal.set(null);
    this.focusNameRequestSignal.set(0);
    this.savingSignal.set(false);
  }

  findById(id: number): Marca | null {
    return this.marcas().find((marca: Marca): boolean => marca.id === id) ?? null;
  }

  findByPublicId(publicId: string): Marca | null {
    return this.marcas().find((marca: Marca): boolean => marca.publicId === publicId) ?? null;
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
