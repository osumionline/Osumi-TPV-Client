import type { InventarioReportColumn } from '@desktop-contracts/almacen/inventario/inventario-report.interface';
import type { InventarioRowInterface } from '@desktop-contracts/almacen/inventario/inventario.interface';
import type {
  InventarioDirtyField,
  InventarioDraftValues,
  InventarioPriceField,
} from '@model/almacen/inventario/inventario-draft.interface';

export type InventarioDataColumn = InventarioReportColumn;

export type InventarioDisplayedColumn = InventarioDataColumn | 'opciones';

export type InventarioKeyboardField = 'stock' | InventarioPriceField | 'codigoBarras';

export interface InventarioColumnOption {
  readonly id: InventarioDataColumn;
  readonly label: string;
}

export interface InventarioDisplayRow extends InventarioRowInterface {
  readonly draft: InventarioDraftValues;
  readonly dirtyFields: readonly InventarioDirtyField[];
  readonly dirty: boolean;
}

export interface InventarioDecimalEditorState {
  readonly idArticulo: number;
  readonly field: InventarioPriceField;
  readonly initialValue: string;
  readonly value: string;
  readonly error: string | null;
}

export const INVENTARIO_COLUMN_OPTIONS: readonly InventarioColumnOption[] = [
  {
    id: 'localizador',
    label: 'Localizador',
  },
  {
    id: 'proveedor',
    label: 'Proveedor',
  },
  {
    id: 'marca',
    label: 'Marca',
  },
  {
    id: 'referencia',
    label: 'Referencia',
  },
  {
    id: 'categoria',
    label: 'Categoría',
  },
  {
    id: 'nombre',
    label: 'Nombre',
  },
  {
    id: 'stock',
    label: 'Stock',
  },
  {
    id: 'precioAlbaran',
    label: 'Precio albarán',
  },
  {
    id: 'puc',
    label: 'PUC',
  },
  {
    id: 'pvp',
    label: 'PVP',
  },
  {
    id: 'margen',
    label: 'Margen',
  },
  {
    id: 'codigoBarras',
    label: 'Código de barras',
  },
];

export const INVENTARIO_DEFAULT_COLUMNS: readonly InventarioDataColumn[] =
  INVENTARIO_COLUMN_OPTIONS.filter(
    (option: InventarioColumnOption): boolean =>
      option.id !== 'categoria' && option.id !== 'precioAlbaran',
  ).map((option: InventarioColumnOption): InventarioDataColumn => option.id);

export const TEXT_SEARCH_DELAY_MS: number = 300;
