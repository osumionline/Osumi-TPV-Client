import type CaducidadFilterQuery from '@backend/contracts/almacen/caducidades/caducidad-filter-query.interface';

export default interface CaducidadRepositoryQuery extends CaducidadFilterQuery {
  readonly offset: number;
  readonly limit: number;
}
