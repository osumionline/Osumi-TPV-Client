import type AlmacenSection from '@model/almacen/almacen-section.type';

export interface WarehouseSectionDefinition {
  readonly id: AlmacenSection;
  readonly label: string;
}

export const WAREHOUSE_SECTIONS: readonly WarehouseSectionDefinition[] = [
  {
    id: 'inventory',
    label: 'INVENTARIO',
  },
  {
    id: 'expirations',
    label: 'CADUCIDADES',
  },
  {
    id: 'printing',
    label: 'IMPRENTA',
  },
];
