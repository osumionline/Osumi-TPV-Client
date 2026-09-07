import { Component, signal, type OnInit, type WritableSignal } from '@angular/core';
import type InventarioPrintDocumentoInterface from '@desktop-contracts/almacen/inventario-print.interface';
import type {
  InventarioReportColumn,
  InventarioReportRowInterface,
} from '@desktop-contracts/almacen/inventario-report.interface';
import { getErrorMessage } from '@utils/error.utils';

const CURRENCY_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  style: 'currency',
  currency: 'EUR',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const PERCENTAGE_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const RIGHT_ALIGNED_COLUMNS: readonly InventarioReportColumn[] = [
  'stock',
  'precioAlbaran',
  'puc',
  'pvp',
  'margen',
];

/**
 * Renderer exclusivo de la vista imprimible de Inventario.
 */
@Component({
  selector: 'otpv-root',
  templateUrl: './inventory-print.component.html',
  styleUrl: './inventory-print.component.scss',
})
export default class InventoryPrintComponent implements OnInit {
  readonly documento: WritableSignal<InventarioPrintDocumentoInterface | null> =
    signal<InventarioPrintDocumentoInterface | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);

  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);

  readonly processing: WritableSignal<boolean> = signal<boolean>(false);

  readonly operationError: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Carga el snapshot almacenado por la BrowserWindow.
   */
  ngOnInit(): void {
    void this.loadDocumento();
  }

  /**
   * Reintenta recuperar el documento de impresión.
   */
  retry(): void {
    if (this.processing()) {
      return;
    }

    void this.loadDocumento();
  }

  /**
   * Solicita el diálogo estándar de impresión del sistema.
   */
  async print(): Promise<void> {
    if (this.documento() === null || this.processing()) {
      return;
    }

    this.processing.set(true);
    this.operationError.set(null);

    try {
      await window.osumiInventarioPrint.print();
    } catch (error: unknown) {
      this.operationError.set(getErrorMessage(error, 'No se ha podido imprimir el inventario.'));
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Devuelve el título visible de una columna.
   */
  getColumnLabel(column: InventarioReportColumn): string {
    switch (column) {
      case 'localizador':
        return 'Localizador';

      case 'proveedor':
        return 'Proveedor';

      case 'marca':
        return 'Marca';

      case 'referencia':
        return 'Referencia';

      case 'categoria':
        return 'Categoría';

      case 'nombre':
        return 'Nombre';

      case 'stock':
        return 'Stock';

      case 'precioAlbaran':
        return 'Precio albarán';

      case 'puc':
        return 'PUC';

      case 'pvp':
        return 'PVP';

      case 'margen':
        return 'Margen';

      case 'codigoBarras':
        return 'Código de barras';
    }
  }

  /**
   * Formatea el valor correspondiente a una celda.
   */
  formatCell(row: InventarioReportRowInterface, column: InventarioReportColumn): string {
    switch (column) {
      case 'localizador':
        return String(row.localizador);

      case 'proveedor':
        return row.proveedorNombre ?? '—';

      case 'marca':
        return row.marcaNombre;

      case 'referencia':
        return row.referencia ?? '—';

      case 'categoria':
        return row.categorias.length === 0 ? '—' : row.categorias.join(', ');

      case 'nombre':
        return row.nombre;

      case 'stock':
        return String(row.stock);

      case 'precioAlbaran':
        return this.formatMicros(row.precioAlbaranMicros);

      case 'puc':
        return this.formatMicros(row.pucMicros);

      case 'pvp':
        return this.formatCents(row.pvpCents);

      case 'margen':
        return this.formatMargin(row.margenMicroporcentaje);

      case 'codigoBarras':
        return row.codigosBarrasAdicionales.length === 0
          ? '—'
          : row.codigosBarrasAdicionales.join(', ');
    }
  }

  /**
   * Indica si una columna debe alinearse a la derecha.
   */
  isRightAligned(column: InventarioReportColumn): boolean {
    return RIGHT_ALIGNED_COLUMNS.includes(column);
  }

  /**
   * Formatea un importe almacenado en microeuros.
   */
  formatMicros(value: number): string {
    return CURRENCY_FORMATTER.format(value / 1_000_000);
  }

  /**
   * Formatea un importe almacenado en céntimos.
   */
  formatCents(value: number): string {
    return CURRENCY_FORMATTER.format(value / 100);
  }

  /**
   * Formatea un porcentaje almacenado en millonésimas.
   */
  formatMargin(value: number): string {
    return `${PERCENTAGE_FORMATTER.format(value / 1_000_000)} %`;
  }

  /**
   * Recupera el documento sin realizar ninguna consulta de negocio.
   */
  private async loadDocumento(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);
    this.operationError.set(null);

    try {
      const documento: InventarioPrintDocumentoInterface =
        await window.osumiInventarioPrint.getDocumento();

      this.documento.set(documento);
    } catch (error: unknown) {
      this.documento.set(null);

      this.loadError.set(
        getErrorMessage(error, 'No se ha podido recuperar la vista de impresión del inventario.'),
      );
    } finally {
      this.loading.set(false);
    }
  }
}
