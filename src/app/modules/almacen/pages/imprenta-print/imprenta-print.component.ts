import {
  Component,
  computed,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import type { ImprentaPrintDocumentoInterface } from '@desktop-contracts/almacen/imprenta-print.interface';
import { getErrorMessage } from '@utils/error.utils';
import { QRCodeComponent } from 'angularx-qrcode';

const CURRENCY_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const MM_TO_PX: number = 96 / 25.4;

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
   * Formatea un importe almacenado en céntimos.
   */
  formatCents(value: number): string {
    return CURRENCY_FORMATTER.format(value / 100);
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
