import type ComprasSection from '@model/compras/compras-section.type';

export interface PurchasesSectionDefinition {
  readonly id: ComprasSection;
  readonly label: string;
}

export const PURCHASES_SECTIONS: readonly PurchasesSectionDefinition[] = [
  {
    id: 'orders',
    label: 'PEDIDOS',
  },
  {
    id: 'brands',
    label: 'MARCAS',
  },
  {
    id: 'suppliers',
    label: 'PROVEEDORES',
  },
];
