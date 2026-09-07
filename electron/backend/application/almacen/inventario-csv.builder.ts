import type {
  InventarioReportColumn,
  InventarioReportInterface,
  InventarioReportRowInterface,
} from '@desktop-contracts/almacen/inventario-report.interface';

interface InventarioCsvColumnDefinition {
  readonly label: string;
  readonly value: (row: InventarioReportRowInterface) => string;
  readonly text: boolean;
}

const DECIMAL_FORMATTER: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
  useGrouping: false,
});

/**
 * Genera el CSV compatible con Excel a partir de un reporte persistido.
 */
export default class InventarioCsvBuilder {
  /**
   * Construye un CSV UTF-8 con BOM y separador de punto y coma.
   */
  build(report: InventarioReportInterface, columns: readonly InventarioReportColumn[]): string {
    const definitions: readonly InventarioCsvColumnDefinition[] = columns.map(
      (column: InventarioReportColumn): InventarioCsvColumnDefinition =>
        this.getColumnDefinition(column),
    );

    const lines: string[] = [
      definitions
        .map((definition: InventarioCsvColumnDefinition): string =>
          this.escapeCell(definition.label),
        )
        .join(';'),
    ];

    for (const row of report.rows) {
      lines.push(
        definitions
          .map((definition: InventarioCsvColumnDefinition): string => {
            const value: string = definition.value(row);

            return this.escapeCell(definition.text ? this.protectSpreadsheetText(value) : value);
          })
          .join(';'),
      );
    }

    return `\uFEFF${lines.join('\r\n')}\r\n`;
  }

  /**
   * Obtiene la definición correspondiente a una columna pública.
   */
  private getColumnDefinition(column: InventarioReportColumn): InventarioCsvColumnDefinition {
    switch (column) {
      case 'localizador':
        return {
          label: 'Localizador',
          value: (row): string => String(row.localizador),
          text: false,
        };

      case 'proveedor':
        return {
          label: 'Proveedor',
          value: (row): string => row.proveedorNombre ?? '',
          text: true,
        };

      case 'marca':
        return {
          label: 'Marca',
          value: (row): string => row.marcaNombre,
          text: true,
        };

      case 'referencia':
        return {
          label: 'Referencia',
          value: (row): string => row.referencia ?? '',
          text: true,
        };

      case 'categoria':
        return {
          label: 'Categoría',
          value: (row): string => row.categorias.join(' | '),
          text: true,
        };

      case 'nombre':
        return {
          label: 'Nombre',
          value: (row): string => row.nombre,
          text: true,
        };

      case 'stock':
        return {
          label: 'Stock',
          value: (row): string => String(row.stock),
          text: false,
        };

      case 'precioAlbaran':
        return {
          label: 'Precio albarán',
          value: (row): string => this.formatMicros(row.precioAlbaranMicros),
          text: false,
        };

      case 'puc':
        return {
          label: 'PUC',
          value: (row): string => this.formatMicros(row.pucMicros),
          text: false,
        };

      case 'pvp':
        return {
          label: 'PVP',
          value: (row): string => this.formatCents(row.pvpCents),
          text: false,
        };

      case 'margen':
        return {
          label: 'Margen',
          value: (row): string => DECIMAL_FORMATTER.format(row.margenMicroporcentaje / 1_000_000),
          text: false,
        };

      case 'codigoBarras':
        return {
          label: 'Código de barras',
          value: (row): string => row.codigosBarrasAdicionales.join(' | '),
          text: true,
        };
    }
  }

  /**
   * Formatea microeuros con dos decimales visibles.
   */
  private formatMicros(value: number): string {
    const cents: number = Math.round(value / 10_000);

    return this.formatCents(cents);
  }

  /**
   * Formatea céntimos usando coma decimal y sin separador de miles.
   */
  private formatCents(value: number): string {
    return DECIMAL_FORMATTER.format(value / 100);
  }

  /**
   * Evita que un texto procedente de datos sea interpretado
   * como fórmula por una hoja de cálculo.
   */
  private protectSpreadsheetText(value: string): string {
    return /^[=+\-@]/.test(value) ? `'${value}` : value;
  }

  /**
   * Escapa un valor según las reglas CSV.
   */
  private escapeCell(value: string): string {
    if (!/[;"\r\n]/.test(value)) {
      return value;
    }

    return `"${value.replace(/"/g, '""')}"`;
  }
}
