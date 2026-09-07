import type InventarioFilterQuery from '@backend/contracts/almacen/inventario-filter-query.interface';

export default interface InventarioRepositoryQuery extends InventarioFilterQuery {
  readonly ventasDesde: string;
  readonly offset: number;
  readonly limit: number;
}
