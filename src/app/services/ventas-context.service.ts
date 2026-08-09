import type { Signal, WritableSignal } from '@angular/core';
import { computed, Injectable, signal } from '@angular/core';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type TerminalInterface from '@desktop-contracts/terminales/terminal.interface';
import type TipoPagoInterface from '@desktop-contracts/tipos-pago/tipo-pago.interface';
import type VentasContextInterface from '@desktop-contracts/ventas/ventas-context.interface';
import TipoPago from '@model/tipos-pago/tipo-pago.model';

/**
 * Mantiene el contexto operativo actual necesario para trabajar en el módulo de ventas.
 */
@Injectable({
  providedIn: 'root',
})
export default class VentasContextService {
  private readonly appDataSignal: WritableSignal<AppData | null> = signal<AppData | null>(null);
  private readonly terminalSignal: WritableSignal<TerminalInterface | null> =
    signal<TerminalInterface | null>(null);
  private readonly cajaAbiertaSignal: WritableSignal<CajaAbiertaInterface | null> =
    signal<CajaAbiertaInterface | null>(null);
  private readonly tiposPagoSignal: WritableSignal<readonly TipoPago[]> = signal<
    readonly TipoPago[]
  >([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);
  private readonly errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  private pendingRequest: Promise<void> | null = null;

  readonly appData: Signal<AppData | null> = this.appDataSignal.asReadonly();
  readonly terminal: Signal<TerminalInterface | null> = this.terminalSignal.asReadonly();
  readonly cajaAbierta: Signal<CajaAbiertaInterface | null> = this.cajaAbiertaSignal.asReadonly();
  readonly tiposPago: Signal<readonly TipoPago[]> = this.tiposPagoSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();
  readonly error: Signal<string | null> = this.errorSignal.asReadonly();

  readonly efectivo: Signal<TipoPago | null> = computed(
    (): TipoPago | null =>
      this.tiposPago().find((tipoPago: TipoPago): boolean => tipoPago.slug === 'efectivo') ?? null,
  );

  readonly puedeVender: Signal<boolean> = computed(
    (): boolean =>
      this.loaded() &&
      this.terminal() !== null &&
      this.cajaAbierta() !== null &&
      this.efectivo() !== null,
  );

  /**
   * Carga el contexto si todavía no está disponible.
   */
  load(): Promise<void> {
    if (this.loaded()) {
      return Promise.resolve();
    }

    return this.loadData();
  }

  /**
   * Vuelve a consultar el contexto operativo aunque ya se hubiese cargado.
   */
  reload(): Promise<void> {
    return this.loadData();
  }

  /**
   * Elimina de memoria el contexto operativo actual.
   */
  clear(): void {
    this.resetData();
    this.errorSignal.set(null);
  }

  /**
   * Evita lanzar varias consultas simultáneas para el mismo contexto.
   */
  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestContext();

    return this.pendingRequest;
  }

  /**
   * Solicita a Electron el contexto operativo y actualiza el estado del servicio.
   */
  private async requestContext(): Promise<void> {
    this.errorSignal.set(null);

    try {
      const result: VentasContextInterface = await window.osumiDesktop.ventas.getContext();

      const tiposPago: readonly TipoPago[] = result.tiposPago.map(
        (tipoPago: TipoPagoInterface): TipoPago => new TipoPago().fromInterface(tipoPago),
      );

      this.appDataSignal.set(result.appData);
      this.terminalSignal.set(result.terminal);
      this.cajaAbiertaSignal.set(result.cajaAbierta);
      this.tiposPagoSignal.set(tiposPago);
      this.loadedSignal.set(true);
    } catch (error: unknown) {
      this.resetData();

      const message: string = error instanceof Error ? error.message : String(error);

      this.errorSignal.set(message);

      throw error;
    } finally {
      this.pendingRequest = null;
    }
  }

  /**
   * Restablece los datos del contexto evitando conservar información obsoleta.
   */
  private resetData(): void {
    this.appDataSignal.set(null);
    this.terminalSignal.set(null);
    this.cajaAbiertaSignal.set(null);
    this.tiposPagoSignal.set([]);
    this.loadedSignal.set(false);
  }
}
