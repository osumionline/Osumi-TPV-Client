export default interface PedidoFilterQuery {
  readonly fechaDesde: string | null;
  readonly fechaHasta: string | null;
  readonly idProveedor: number | null;
  readonly numero: string | null;
  readonly importeDesdeMicros: number | null;
  readonly importeHastaMicros: number | null;
}
