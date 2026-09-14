import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import mapVentaToCrearReservaCommand from '@model/reservas/crear-reserva-command.mapper';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import { getErrorMessage } from '@utils/error.utils';

@Service()
export default class ReservasService {
  private readonly reservasSignal: WritableSignal<readonly ReservaInterface[]> = signal<
    readonly ReservaInterface[]
  >([]);

  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private readonly loadingSignal: WritableSignal<boolean> = signal<boolean>(false);

  private readonly errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  private pendingRequest: Promise<void> | null = null;

  readonly reservas: Signal<readonly ReservaInterface[]> = this.reservasSignal.asReadonly();

  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

  readonly loading: Signal<boolean> = this.loadingSignal.asReadonly();

  readonly error: Signal<string | null> = this.errorSignal.asReadonly();

  /**
   * Persiste una venta como nueva reserva y devuelve
   * la instancia canónica obtenida después de recargar.
   */
  async createFromVenta(venta: VentaEnCurso): Promise<ReservaInterface> {
    const command = mapVentaToCrearReservaCommand(venta);

    /*
     * Evitamos que una carga anterior a la creación
     * pueda dejar después el cache con datos obsoletos.
     */
    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const publicId: string = await window.osumiDesktop.reservas.create(command);

    await this.reload();

    const reserva: ReservaInterface | undefined = this.reservas().find(
      (item: ReservaInterface): boolean => item.publicId === publicId,
    );

    if (reserva === undefined) {
      throw new Error('La reserva se ha creado pero no ha podido recuperarse después.');
    }

    return reserva;
  }

  /**
   * Carga las reservas si todavía no se han
   * recuperado durante esta sesión.
   */
  load(): Promise<void> {
    if (this.loaded()) {
      return Promise.resolve();
    }

    return this.loadData();
  }

  /**
   * Fuerza una nueva lectura de SQLite.
   *
   * Si existe una petición anterior en curso, espera primero
   * a que termine para garantizar que la siguiente lectura
   * comienza después del momento en el que se solicitó reload().
   */
  async reload(): Promise<void> {
    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    await this.loadData();
  }

  /**
   * Elimina una línea y actualiza después
   * la colección canónica.
   */
  async deleteLinea(publicId: string): Promise<void> {
    await window.osumiDesktop.reservas.deleteLinea(publicId);

    await this.reload();
  }

  /**
   * Elimina una reserva completa y actualiza
   * después la colección.
   */
  async deleteReserva(publicId: string): Promise<void> {
    await window.osumiDesktop.reservas.deleteReserva(publicId);

    await this.reload();
  }

  clear(): void {
    this.reservasSignal.set([]);
    this.loadedSignal.set(false);
    this.loadingSignal.set(false);
    this.errorSignal.set(null);
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestReservas();

    return this.pendingRequest;
  }

  private async requestReservas(): Promise<void> {
    this.loadingSignal.set(true);
    this.errorSignal.set(null);

    try {
      const reservas: readonly ReservaInterface[] = await window.osumiDesktop.reservas.getAll();

      this.reservasSignal.set(reservas);

      this.loadedSignal.set(true);
    } catch (error: unknown) {
      this.errorSignal.set(getErrorMessage(error, 'No se han podido cargar las reservas.'));
    } finally {
      this.loadingSignal.set(false);
      this.pendingRequest = null;
    }
  }
}
