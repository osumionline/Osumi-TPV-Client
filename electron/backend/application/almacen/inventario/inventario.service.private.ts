import type { InventarioReportColumn } from '@desktop-contracts/almacen/inventario/inventario-report.interface';

const INVENTARIO_REPORT_COLUMNS: readonly InventarioReportColumn[] = [
  'localizador',
  'proveedor',
  'marca',
  'referencia',
  'categoria',
  'nombre',
  'stock',
  'precioAlbaran',
  'puc',
  'pvp',
  'margen',
  'codigoBarras',
];

export default INVENTARIO_REPORT_COLUMNS;
