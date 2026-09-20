import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import type ReordenarTiposPagoCommand from '@desktop-contracts/configuration/tipos-pago/reordenar-tipos-pago-command.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import TipoPago from '@model/tipos-pago/tipo-pago.model';

const EFECTIVO_SLUG: string = 'efectivo';

@Service()
export default class TiposPagoService {
  private readonly tiposPagoSignal: WritableSignal<readonly TipoPago[]> = signal<
    readonly TipoPago[]
  >([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly reorderingSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly tiposPago: Signal<readonly TipoPago[]> = this.tiposPagoSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();
  readonly reordering: Signal<boolean> = this.reorderingSignal.asReadonly();

  /**
   * Carga los tipos de pago una única vez
   * salvo que ya estén disponibles en memoria.
   */
  load(): Promise<void> {
    if (this.loaded()) {
      return Promise.resolve();
    }

    return this.loadData();
  }

  /**
   * Fuerza una nueva carga del maestro
   * global de tipos de pago.
   */
  reload(): Promise<void> {
    return this.loadData();
  }

  /**
   * Limpia completamente el maestro
   * de tipos de pago en memoria.
   */
  clear(): void {
    this.tiposPagoSignal.set([]);
    this.loadedSignal.set(false);
    this.reorderingSignal.set(false);
  }

  /**
   * Crea un tipo de pago y lo incorpora
   * inmediatamente al maestro en memoria.
   */
  async create(command: CrearTipoPagoCommand): Promise<TipoPago> {
    const result: TipoPagoInterface = await window.osumiDesktop.tiposPago.create(command);

    const tipoPago: TipoPago = this.toModel(result);

    this.upsertTipoPago(tipoPago);

    return tipoPago;
  }

  /**
   * Actualiza un tipo de pago y sustituye
   * inmediatamente su versión en memoria.
   */
  async update(id: number, command: ActualizarTipoPagoCommand): Promise<TipoPago> {
    const result: TipoPagoInterface = await window.osumiDesktop.tiposPago.update(id, command);

    const tipoPago: TipoPago = this.toModel(result);

    this.upsertTipoPago(tipoPago);

    return tipoPago;
  }

  /**
   * Reordena de forma optimista los tipos de pago
   * configurables y persiste inmediatamente el cambio.
   *
   * Si Electron rechaza la operación, restaura
   * exactamente el maestro anterior.
   */
  async reorder(command: ReordenarTiposPagoCommand): Promise<void> {
    if (this.reordering()) {
      throw new Error('Ya hay una reordenación de tipos de pago en curso.');
    }

    const previous: readonly TipoPago[] = this.tiposPagoSignal();

    const optimistic: readonly TipoPago[] = this.createOptimisticReorder(previous, command);

    this.reorderingSignal.set(true);

    /*
     * La UI refleja inmediatamente el drop.
     * SQLite se confirma a continuación.
     */
    this.tiposPagoSignal.set(optimistic);

    try {
      const result: readonly TipoPagoInterface[] =
        await window.osumiDesktop.tiposPago.reorder(command);

      /*
       * La respuesta backend es la fuente
       * canónica después del COMMIT.
       */
      this.setTiposPagoFromInterfaces(result);
    } catch (error: unknown) {
      /*
       * Restauramos exactamente el snapshot
       * existente antes de iniciar el reorder.
       */
      this.tiposPagoSignal.set(previous);

      throw error;
    } finally {
      this.reorderingSignal.set(false);
    }
  }

  /**
   * Da de baja un tipo de pago y lo retira
   * inmediatamente del maestro en memoria.
   */
  async deactivate(id: number): Promise<void> {
    await window.osumiDesktop.tiposPago.deactivate(id);

    this.tiposPagoSignal.update((tiposPago: readonly TipoPago[]): readonly TipoPago[] =>
      tiposPago.filter((tipoPago: TipoPago): boolean => tipoPago.id !== id),
    );
  }

  /**
   * Busca un tipo de pago cargado
   * por su identificador interno.
   */
  findById(id: number): TipoPago | null {
    return this.tiposPago().find((tipoPago: TipoPago): boolean => tipoPago.id === id) ?? null;
  }

  /**
   * Busca un tipo de pago cargado
   * por su publicId.
   */
  findByPublicId(publicId: string): TipoPago | null {
    return (
      this.tiposPago().find((tipoPago: TipoPago): boolean => tipoPago.publicId === publicId) ?? null
    );
  }

  /**
   * Busca un tipo de pago cargado
   * por su slug interno.
   */
  findBySlug(slug: string): TipoPago | null {
    const normalizedSlug: string = slug.trim().toLocaleLowerCase('es-ES');

    return (
      this.tiposPago().find(
        (tipoPago: TipoPago): boolean =>
          tipoPago.slug.toLocaleLowerCase('es-ES') === normalizedSlug,
      ) ?? null
    );
  }

  /**
   * Gestiona una carga evitando peticiones
   * concurrentes duplicadas.
   */
  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestTiposPago();

    return this.pendingRequest;
  }

  /**
   * Recupera y transforma el maestro
   * recibido desde Electron.
   */
  private async requestTiposPago(): Promise<void> {
    try {
      const result: readonly TipoPagoInterface[] = await window.osumiDesktop.tiposPago.getAll();

      this.setTiposPagoFromInterfaces(result);

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }

  /**
   * Construye el maestro temporal que debe mostrarse
   * mientras se confirma la persistencia del reorder.
   */
  private createOptimisticReorder(
    current: readonly TipoPago[],
    command: ReordenarTiposPagoCommand,
  ): readonly TipoPago[] {
    const configurables: readonly TipoPago[] = current.filter(
      (tipoPago: TipoPago): boolean => tipoPago.slug.toLocaleLowerCase('es-ES') !== EFECTIVO_SLUG,
    );

    const configurableById: ReadonlyMap<number, TipoPago> = new Map<number, TipoPago>(
      configurables.flatMap(
        (tipoPago: TipoPago): readonly [readonly [number, TipoPago]] | readonly [] =>
          tipoPago.id === null ? [] : [[tipoPago.id, tipoPago]],
      ),
    );

    const ids: readonly number[] = command.ids;

    if (
      ids.length !== configurables.length ||
      new Set<number>(ids).size !== ids.length ||
      !ids.every((id: number): boolean => configurableById.has(id))
    ) {
      throw new Error(
        'El orden recibido no coincide con los tipos de pago configurables cargados.',
      );
    }

    const reordered: readonly TipoPago[] = ids.map((id: number, index: number): TipoPago => {
      const tipoPago: TipoPago | undefined = configurableById.get(id);

      if (tipoPago === undefined) {
        throw new Error('No se ha podido resolver un tipo de pago durante la reordenación.');
      }

      return new TipoPago().fromInterface({
        ...tipoPago.toInterface(),
        orden: index + 1,
      });
    });

    const structural: readonly TipoPago[] = current.filter(
      (tipoPago: TipoPago): boolean => tipoPago.slug.toLocaleLowerCase('es-ES') === EFECTIVO_SLUG,
    );

    return this.sortTiposPago([...structural, ...reordered]);
  }

  /**
   * Sustituye el maestro renderer por la
   * representación canónica recibida de Electron.
   */
  private setTiposPagoFromInterfaces(result: readonly TipoPagoInterface[]): void {
    const tiposPago: readonly TipoPago[] = result.map((tipoPago: TipoPagoInterface): TipoPago =>
      this.toModel(tipoPago),
    );

    this.tiposPagoSignal.set(this.sortTiposPago(tiposPago));
  }

  /**
   * Inserta o sustituye un tipo de pago
   * dentro del maestro canónico en memoria.
   */
  private upsertTipoPago(tipoPago: TipoPago): void {
    this.tiposPagoSignal.update((current: readonly TipoPago[]): readonly TipoPago[] => {
      const exists: boolean = current.some((item: TipoPago): boolean => item.id === tipoPago.id);

      const updated: readonly TipoPago[] = exists
        ? current.map((item: TipoPago): TipoPago => (item.id === tipoPago.id ? tipoPago : item))
        : [...current, tipoPago];

      return this.sortTiposPago(updated);
    });
  }

  /**
   * Convierte el contrato recibido desde
   * Electron en el modelo del renderer.
   */
  private toModel(tipoPago: TipoPagoInterface): TipoPago {
    return new TipoPago().fromInterface(tipoPago);
  }

  /**
   * Ordena el maestro según la prioridad
   * persistida y usa nombre/id como desempate.
   */
  private sortTiposPago(tiposPago: readonly TipoPago[]): readonly TipoPago[] {
    return [...tiposPago].sort((first: TipoPago, second: TipoPago): number => {
      const orderDifference: number = first.orden - second.orden;

      if (orderDifference !== 0) {
        return orderDifference;
      }

      const nameDifference: number = first.nombre.localeCompare(second.nombre, 'es', {
        sensitivity: 'base',
      });

      if (nameDifference !== 0) {
        return nameDifference;
      }

      return (first.id ?? 0) - (second.id ?? 0);
    });
  }
}
