import type { ImprentaArticuloSearchInterface } from '@desktop-contracts/almacen/imprenta/imprenta-articulo.interface';

export const SEARCH_DELAY_MS: number = 250;

export type ImprentaPreviewSlotType = 'articulo' | 'hueco' | 'libre';

export interface ImprentaPreviewSlot {
  readonly id: string;
  readonly tipo: ImprentaPreviewSlotType;
  readonly articulo: ImprentaArticuloSearchInterface | null;
}
