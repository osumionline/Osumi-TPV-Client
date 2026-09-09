import type {
  InventarioReportColumn,
  InventarioReportInterface,
} from '@desktop-contracts/almacen/inventario/inventario-report.interface';

export default interface InventarioPrintDocumentoInterface {
  readonly columnas: readonly InventarioReportColumn[];
  readonly report: InventarioReportInterface;
}
