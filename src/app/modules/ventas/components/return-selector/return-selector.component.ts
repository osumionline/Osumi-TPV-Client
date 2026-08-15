import { CurrencyPipe } from '@angular/common';
import {
  Component,
  computed,
  input,
  output,
  signal,
  type InputSignal,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type { VentaDevolucionLineaInterface } from '@desktop-contracts/ventas/venta-devolucion.interface';
import type VentaDevolucionSeleccion from '@model/ventas/venta-devolucion-seleccion.interface';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';

@Component({
  selector: 'otpv-return-selector',
  templateUrl: './return-selector.component.html',
  styleUrl: './return-selector.component.scss',
  imports: [
    CurrencyPipe,
    BpsToPercentPipe,
    CentsToEurosPipe,
    MicrosToEurosPipe,
    MatButton,
    MatCheckbox,
  ],
})
export default class ReturnSelectorComponent implements OnInit {
  readonly devolucion: InputSignal<VentaDevolucionInterface> =
    input.required<VentaDevolucionInterface>();

  readonly initialSelection: InputSignal<readonly VentaDevolucionSeleccion[]> = input<
    readonly VentaDevolucionSeleccion[]
  >([]);

  readonly selectEvent: OutputEmitterRef<readonly VentaDevolucionSeleccion[]> =
    output<readonly VentaDevolucionSeleccion[]>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly seleccion: WritableSignal<ReadonlyMap<number, number | null>> = signal<
    ReadonlyMap<number, number | null>
  >(new Map<number, number | null>());

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly lineasSeleccionables: Signal<readonly VentaDevolucionLineaInterface[]> = computed(
    (): readonly VentaDevolucionLineaInterface[] =>
      this.devolucion().lineas.filter(
        (linea: VentaDevolucionLineaInterface): boolean => linea.unidadesDisponibles > 0,
      ),
  );

  readonly allSelected: Signal<boolean> = computed((): boolean => {
    const lineas: readonly VentaDevolucionLineaInterface[] = this.lineasSeleccionables();

    return (
      lineas.length > 0 &&
      lineas.every((linea: VentaDevolucionLineaInterface): boolean =>
        this.seleccion().has(linea.id),
      )
    );
  });

  readonly someSelected: Signal<boolean> = computed(
    (): boolean => this.seleccion().size > 0 && !this.allSelected(),
  );

  readonly canContinue: Signal<boolean> = computed((): boolean => {
    const seleccion: ReadonlyMap<number, number | null> = this.seleccion();

    if (seleccion.size === 0) {
      return false;
    }

    return this.devolucion().lineas.every((linea: VentaDevolucionLineaInterface): boolean => {
      if (!seleccion.has(linea.id)) {
        return true;
      }

      return this.isValidUnidades(linea, seleccion.get(linea.id) ?? null);
    });
  });

  /**
   * Restaura la selección de una devolución que ya estaba
   * incorporada a la venta.
   */
  ngOnInit(): void {
    const seleccion: Map<number, number | null> = new Map<number, number | null>();

    for (const item of this.initialSelection()) {
      seleccion.set(item.linea.id, item.unidades);
    }

    this.seleccion.set(seleccion);
  }

  /**
   * Indica si una línea está seleccionada.
   */
  isSelected(linea: VentaDevolucionLineaInterface): boolean {
    return this.seleccion().has(linea.id);
  }

  /**
   * Activa o desactiva una línea.
   *
   * Al seleccionarla se proponen por defecto todas las
   * unidades que todavía pueden devolverse.
   */
  toggleLinea(linea: VentaDevolucionLineaInterface, checked: boolean): void {
    if (linea.unidadesDisponibles <= 0) {
      return;
    }

    const seleccion: Map<number, number | null> = new Map<number, number | null>(this.seleccion());

    if (checked) {
      seleccion.set(linea.id, linea.unidadesDisponibles);
    } else {
      seleccion.delete(linea.id);
    }

    this.error.set(null);
    this.seleccion.set(seleccion);
  }

  /**
   * Selecciona o deselecciona todas las líneas devolvibles.
   */
  toggleAll(checked: boolean): void {
    if (!checked) {
      this.seleccion.set(new Map<number, number | null>());

      this.error.set(null);

      return;
    }

    const seleccion: Map<number, number | null> = new Map<number, number | null>();

    for (const linea of this.lineasSeleccionables()) {
      seleccion.set(linea.id, linea.unidadesDisponibles);
    }

    this.error.set(null);
    this.seleccion.set(seleccion);
  }

  /**
   * Actualiza las unidades solicitadas para una línea seleccionada.
   */
  updateUnidades(linea: VentaDevolucionLineaInterface, event: Event): void {
    if (!this.isSelected(linea)) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const unidades: number | null = Number.isNaN(inputElement.valueAsNumber)
      ? null
      : inputElement.valueAsNumber;

    const seleccion: Map<number, number | null> = new Map<number, number | null>(this.seleccion());

    seleccion.set(linea.id, unidades);

    this.error.set(null);
    this.seleccion.set(seleccion);
  }

  /**
   * Obtiene el valor que debe mostrarse en el input de unidades.
   */
  getUnidadesValue(linea: VentaDevolucionLineaInterface): number | string {
    const seleccion: ReadonlyMap<number, number | null> = this.seleccion();

    if (!seleccion.has(linea.id)) {
      return linea.unidadesDisponibles;
    }

    const unidades: number | null | undefined = seleccion.get(linea.id);

    return unidades ?? '';
  }

  /**
   * Confirma las líneas seleccionadas.
   */
  continue(): void {
    if (!this.canContinue()) {
      this.error.set(
        this.seleccion().size === 0
          ? 'Debes seleccionar al menos una línea para realizar la devolución.'
          : 'Comprueba las unidades indicadas antes de continuar.',
      );

      return;
    }

    const seleccion: VentaDevolucionSeleccion[] = [];

    for (const linea of this.devolucion().lineas) {
      if (!this.seleccion().has(linea.id)) {
        continue;
      }

      const unidades: number | null = this.seleccion().get(linea.id) ?? null;

      if (!this.isValidUnidades(linea, unidades)) {
        return;
      }

      seleccion.push({
        linea,
        unidades,
      });
    }

    this.selectEvent.emit(seleccion);
  }

  /**
   * Cancela la selección sin modificar la venta.
   */
  cancel(): void {
    this.cancelEvent.emit();
  }

  /**
   * Devuelve una etiqueta legible para el ticket.
   */
  getTicketLabel(): string {
    const devolucion: VentaDevolucionInterface = this.devolucion();

    const serie: string = devolucion.serie.trim();

    return serie === '' ? String(devolucion.numero) : `${serie}-${devolucion.numero}`;
  }

  /**
   * Formatea la fecha sin conversiones de zona horaria.
   */
  formatFecha(fecha: string): string {
    const match: RegExpExecArray | null = /^(\d{4})-(\d{2})-(\d{2})/.exec(fecha);

    if (match === null) {
      return fecha;
    }

    return `${match[3]}/${match[2]}/${match[1]}`;
  }

  /**
   * Comprueba una cantidad seleccionada.
   */
  private isValidUnidades(
    linea: VentaDevolucionLineaInterface,
    unidades: number | null,
  ): unidades is number {
    return (
      unidades !== null &&
      Number.isSafeInteger(unidades) &&
      unidades >= 1 &&
      unidades <= linea.unidadesDisponibles
    );
  }
}
