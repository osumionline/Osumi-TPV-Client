import {
  Component,
  computed,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { ImprentaPrintDocumentoInterface } from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';
import { getErrorMessage } from '@utils/error.utils';
import { formatEuros } from '@utils/format.utils';
import { QRCodeComponent } from 'angularx-qrcode';
import MM_TO_PX from './imprenta-print.component.private';

/**
 * Renderer exclusivo de la hoja definitiva de etiquetas.
 */
@Component({
  selector: 'otpv-root',
  templateUrl: './imprenta-print.component.html',
  styleUrl: './imprenta-print.component.scss',
  imports: [QRCodeComponent],
})
export default class ImprentaPrintComponent implements OnInit {
  readonly documento: WritableSignal<ImprentaPrintDocumentoInterface | null> =
    signal<ImprentaPrintDocumentoInterface | null>(null);
  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);
  readonly processing: WritableSignal<boolean> = signal<boolean>(false);
  readonly operationError: WritableSignal<string | null> = signal<string | null>(null);
  readonly qrWidth: Signal<number> = computed((): number => this.calculateQrWidth());
  readonly dense: Signal<boolean> = computed((): boolean => {
    const documento: ImprentaPrintDocumentoInterface | null = this.documento();

    return documento !== null && Math.max(documento.filas, documento.columnas) >= 7;
  });
  readonly veryDense: Signal<boolean> = computed((): boolean => {
    const documento: ImprentaPrintDocumentoInterface | null = this.documento();

    return documento !== null && Math.max(documento.filas, documento.columnas) >= 9;
  });

  /**
   * Recupera el snapshot canónico de esta ventana.
   */
  ngOnInit(): void {
    void this.loadDocumento();
  }

  /**
   * Reintenta recuperar el documento asociado.
   */
  retry(): void {
    void this.loadDocumento();
  }

  /**
   * Abre el diálogo estándar de impresión para
   * la hoja canónica actualmente mostrada.
   */
  async print(): Promise<void> {
    if (this.documento() === null || this.processing()) {
      return;
    }

    this.processing.set(true);
    this.operationError.set(null);

    try {
      await window.osumiImprentaPrint.print();
    } catch (error: unknown) {
      this.operationError.set(
        getErrorMessage(error, 'No se ha podido imprimir la hoja de etiquetas.'),
      );
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Formatea un importe almacenado en céntimos.
   */
  formatCents(value: number): string {
    return formatEuros(value / 100);
  }

  /**
   * Convierte el localizador al contenido textual del QR.
   */
  formatQrData(localizador: number): string {
    return String(localizador);
  }

  /**
   * Recupera el snapshot sin realizar ninguna
   * nueva consulta de negocio desde el renderer.
   */
  private async loadDocumento(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    this.operationError.set(null);

    try {
      this.documento.set(await window.osumiImprentaPrint.getDocumento());
    } catch (error: unknown) {
      this.documento.set(null);
      this.loadError.set(getErrorMessage(error, 'No se ha podido recuperar la hoja de etiquetas.'));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Calcula el QR a partir de las dimensiones físicas
   * de cada celda de la hoja A4.
   */
  private calculateQrWidth(): number {
    const documento: ImprentaPrintDocumentoInterface | null = this.documento();

    if (documento === null) {
      return 32;
    }

    const pageWidthMm: number = documento.orientacion === 'portrait' ? 210 : 297;
    const pageHeightMm: number = documento.orientacion === 'portrait' ? 297 : 210;
    const cellWidthMm: number = pageWidthMm / documento.columnas;
    const cellHeightMm: number = pageHeightMm / documento.filas;
    const qrSizeMm: number = Math.min(cellWidthMm * 0.36, cellHeightMm * 0.7);

    return Math.max(24, Math.min(160, Math.round(qrSizeMm * MM_TO_PX)));
  }
}
