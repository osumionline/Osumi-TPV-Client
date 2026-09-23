import {
  Component,
  computed,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type {
  CajaInformeDetalladoPrintDocumento,
  CajaInformePrintDocumento,
  CajaInformeSimplePrintDocumento,
} from '@desktop-contracts/caja/informes/caja-informe-print.interface';
import DetailedReportComponent from '@modules/caja/components/detailed-report/detailed-report.component';
import SimpleReportComponent from '@modules/caja/components/simple-report/simple-report.component';
import { formatMonthName } from '@utils/date.utils';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Renderer exclusivo de la ventana
 * imprimible de Informes de Caja.
 */
@Component({
  selector: 'otpv-root',
  templateUrl: './cash-report-print.component.html',
  styleUrl: './cash-report-print.component.scss',
  imports: [SimpleReportComponent, DetailedReportComponent],
})
export default class CashReportPrintComponent implements OnInit {
  readonly documento: WritableSignal<CajaInformePrintDocumento | null> =
    signal<CajaInformePrintDocumento | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);
  readonly processing: WritableSignal<boolean> = signal<boolean>(false);
  readonly operationError: WritableSignal<string | null> = signal<string | null>(null);

  readonly simpleDocumento: Signal<CajaInformeSimplePrintDocumento | null> = computed(
    (): CajaInformeSimplePrintDocumento | null => {
      const documento: CajaInformePrintDocumento | null = this.documento();

      return documento?.tipo === 'simple' ? documento : null;
    },
  );

  readonly detalladoDocumento: Signal<CajaInformeDetalladoPrintDocumento | null> = computed(
    (): CajaInformeDetalladoPrintDocumento | null => {
      const documento: CajaInformePrintDocumento | null = this.documento();

      return documento?.tipo === 'detallado' ? documento : null;
    },
  );

  /**
   * Recupera el snapshot asignado
   * a esta ventana.
   */
  ngOnInit(): void {
    void this.loadDocumento();
  }

  /**
   * Reintenta recuperar el documento.
   */
  retry(): void {
    if (this.processing()) {
      return;
    }

    void this.loadDocumento();
  }

  /**
   * Abre el diálogo estándar
   * de impresión del sistema.
   */
  async print(): Promise<void> {
    if (this.documento() === null || this.processing()) {
      return;
    }

    this.processing.set(true);
    this.operationError.set(null);

    try {
      await window.osumiCajaInformePrint.print();
    } catch (error: unknown) {
      this.operationError.set(getErrorMessage(error, 'No se ha podido imprimir el informe.'));
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Devuelve el título visible
   * correspondiente al informe.
   */
  getReportLabel(documento: CajaInformePrintDocumento): string {
    switch (documento.tipo) {
      case 'simple':
        return 'Informe Simple';

      case 'detallado':
        return 'Informe Detallado';

      case 'ventas':
        return 'Informe de Ventas';
    }
  }

  /**
   * Devuelve la descripción legible
   * del periodo del informe.
   */
  getPeriodLabel(documento: CajaInformePrintDocumento): string {
    if (documento.consulta.month === 'todos') {
      return String(documento.consulta.year);
    }

    return [formatMonthName(documento.consulta.month), 'de', documento.consulta.year].join(' ');
  }

  /**
   * Recupera el documento desde el preload
   * sin realizar nuevas consultas de negocio.
   */
  private async loadDocumento(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    this.operationError.set(null);

    try {
      const documento: CajaInformePrintDocumento =
        await window.osumiCajaInformePrint.getDocumento();

      this.documento.set(documento);
    } catch (error: unknown) {
      this.documento.set(null);

      this.loadError.set(getErrorMessage(error, 'No se ha podido recuperar el informe.'));
    } finally {
      this.loading.set(false);
    }
  }
}
