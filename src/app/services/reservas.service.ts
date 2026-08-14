import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';

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
   */
  reload(): Promise<void> {
    return this.loadData();
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
      this.errorSignal.set(
        error instanceof Error ? error.message : 'No se han podido cargar las reservas.',
      );
    } finally {
      this.loadingSignal.set(false);
      this.pendingRequest = null;
    }
  }
}
