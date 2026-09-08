import { Component, signal, type OnInit, type WritableSignal } from '@angular/core';
import type { CaducidadReportInterface } from '@desktop-contracts/almacen/caducidad-report.interface';
import { getErrorMessage } from '@utils/error.utils';

const MONTH_NAMES: readonly string[] = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

const CURRENCY_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const INTEGER_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  maximumFractionDigits: 0,
});

/**
 * Renderer exclusivo del informe agregado de Caducidades.
 */
@Component({
  selector: 'otpv-root',
  templateUrl: './caducidad-report.component.html',
  styleUrl: './caducidad-report.component.scss',
})
export default class CaducidadReportComponent implements OnInit {
  readonly documento: WritableSignal<CaducidadReportInterface | null> =
    signal<CaducidadReportInterface | null>(null);
  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);
  readonly expandedYears: WritableSignal<ReadonlySet<number>> = signal<ReadonlySet<number>>(
    new Set<number>(),
  );
  readonly expandedMonths: WritableSignal<ReadonlySet<string>> = signal<ReadonlySet<string>>(
    new Set<string>(),
  );

  /**
   * Recupera el snapshot asignado a esta ventana.
   */
  ngOnInit(): void {
    void this.loadDocumento();
  }

  /**
   * Reintenta recuperar el informe.
   */
  retry(): void {
    void this.loadDocumento();
  }

  /**
   * Expande o contrae un año.
   */
  toggleYear(anio: number): void {
    const next: Set<number> = new Set<number>(this.expandedYears());

    if (next.has(anio)) {
      next.delete(anio);
    } else {
      next.add(anio);
    }

    this.expandedYears.set(next);
  }

  /**
   * Indica si un año está expandido.
   */
  isYearExpanded(anio: number): boolean {
    return this.expandedYears().has(anio);
  }

  /**
   * Expande o contrae un mes dentro de su año.
   */
  toggleMonth(anio: number, mes: number): void {
    const key: string = this.createMonthKey(anio, mes);
    const next: Set<string> = new Set<string>(this.expandedMonths());

    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }

    this.expandedMonths.set(next);
  }

  /**
   * Indica si un mes está expandido.
   */
  isMonthExpanded(anio: number, mes: number): boolean {
    return this.expandedMonths().has(this.createMonthKey(anio, mes));
  }

  /**
   * Devuelve el nombre visible de un mes.
   */
  formatMonth(mes: number): string {
    return MONTH_NAMES[mes - 1] ?? `Mes ${mes}`;
  }

  /**
   * Formatea un número entero.
   */
  formatInteger(value: number): string {
    return INTEGER_FORMATTER.format(value);
  }

  /**
   * Formatea un importe almacenado en céntimos.
   */
  formatCents(value: number): string {
    return CURRENCY_FORMATTER.format(value / 100);
  }

  /**
   * Formatea un importe almacenado en microeuros.
   */
  formatMicros(value: number): string {
    return CURRENCY_FORMATTER.format(value / 1_000_000);
  }

  /**
   * Recupera el documento sin realizar nuevas consultas de negocio.
   */
  private async loadDocumento(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const documento: CaducidadReportInterface = await window.osumiCaducidadReport.getDocumento();

      this.documento.set(documento);
      this.expandedYears.set(new Set<number>());
      this.expandedMonths.set(new Set<string>());
    } catch (error: unknown) {
      this.documento.set(null);
      this.loadError.set(
        getErrorMessage(error, 'No se ha podido recuperar el informe de caducidades.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Construye la identidad local de un mes expandible.
   */
  private createMonthKey(anio: number, mes: number): string {
    return `${anio}-${mes}`;
  }
}
