import type { ImprentaArticuloSearchInterface } from '@desktop-contracts/almacen/imprenta-articulo.interface';

export default interface ImprentaDesignItem {
  readonly id: string;
  readonly tipo: 'articulo' | 'hueco';
  readonly articulo: ImprentaArticuloSearchInterface | null;
  readonly cantidad: number;
}
