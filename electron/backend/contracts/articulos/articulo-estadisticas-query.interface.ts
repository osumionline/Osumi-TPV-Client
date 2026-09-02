export default interface ArticuloEstadisticasRepositoryQuery {
  readonly idArticulo: number;
  readonly metric: 'units' | 'amount';
  readonly year: number | null;
  readonly month: number | null;
}
