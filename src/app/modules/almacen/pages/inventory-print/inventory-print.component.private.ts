import type { InventarioReportColumn } from '@desktop-contracts/almacen/inventario/inventario-report.interface';

const RIGHT_ALIGNED_COLUMNS: readonly InventarioReportColumn[] = [
  'stock',
  'precioAlbaran',
  'puc',
  'pvp',
  'margen',
];

export default RIGHT_ALIGNED_COLUMNS;
