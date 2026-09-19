import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import TipoPago from '@model/tipos-pago/tipo-pago.model';

@Service()
export default class TiposPagoService {
  private readonly tiposPagoSignal: WritableSignal<readonly TipoPago[]> = signal<
    readonly TipoPago[]
  >([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly tiposPago: Signal<readonly TipoPago[]> = this.tiposPagoSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

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

      const tiposPago: readonly TipoPago[] = result.map((tipoPago: TipoPagoInterface): TipoPago =>
        this.toModel(tipoPago),
      );

      this.tiposPagoSignal.set(this.sortTiposPago(tiposPago));

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
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
