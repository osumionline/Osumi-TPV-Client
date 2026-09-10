import type { InventarioReportColumn } from '@desktop-contracts/almacen/inventario/inventario-report.interface';
import type { InventarioDraftEntry } from '@model/almacen/inventario/inventario-draft.interface';

export default interface InventarioWorkspaceState {
  readonly idProveedor: number | null;
  readonly idMarca: number | null;
  readonly idCategoria: number | null;
  readonly texto: string;
  readonly conDescuento: boolean;
  readonly pagina: number;
  readonly num: number;
  readonly selectedColumns: readonly InventarioReportColumn[];
  readonly drafts: ReadonlyMap<number, InventarioDraftEntry>;
}
