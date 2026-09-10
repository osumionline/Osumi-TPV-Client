export default interface PedidoListadoWorkspaceState {
  readonly fechaDesde: string;
  readonly fechaHasta: string;
  readonly idProveedor: number | null;
  readonly numero: string;
  readonly importeDesde: string;
  readonly importeHasta: string;
  readonly pagina: number;
  readonly num: number;
}
