/**
 * Conserva el contexto necesario para saltar entre
 * un Pedido y la creación de un Artículo.
 */
export default interface PurchaseOrderArticleFlowState {
  readonly idPedido: number;
  readonly idArticulo: number | null;
}
