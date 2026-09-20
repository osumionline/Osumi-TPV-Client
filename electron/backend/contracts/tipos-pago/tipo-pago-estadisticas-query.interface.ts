export default interface TipoPagoEstadisticasRepositoryQuery {
  readonly idTipoPago: number;
  readonly year: number | null;
  readonly month: number | null;
}
