import type PurchaseOrderArticleFlowState from '@model/compras/pedidos/purchase-order-article-flow.interface';

export const PURCHASE_ORDER_ARTICLE_FLOW_STATE_KEY = 'purchaseOrderArticleFlow';

/**
 * Valida el estado de navegación utilizado por el
 * flujo Pedido → Artículos → Pedido.
 */
export function parsePurchaseOrderArticleFlowState(
  value: unknown,
): PurchaseOrderArticleFlowState | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate: Record<string, unknown> = value as Record<string, unknown>;

  const idPedido: unknown = candidate['idPedido'];

  const idArticulo: unknown = candidate['idArticulo'];

  if (typeof idPedido !== 'number' || !Number.isSafeInteger(idPedido) || idPedido <= 0) {
    return null;
  }

  if (
    idArticulo !== null &&
    (typeof idArticulo !== 'number' || !Number.isSafeInteger(idArticulo) || idArticulo <= 0)
  ) {
    return null;
  }

  return {
    idPedido,
    idArticulo,
  };
}

/**
 * Obtiene el artículo que debe incorporarse únicamente
 * cuando el retorno pertenece al Pedido actual.
 */
export function getPurchaseOrderReturnedArticleId(
  state: PurchaseOrderArticleFlowState | null,
  idPedido: number,
): number | null {
  if (state === null || state.idPedido !== idPedido || state.idArticulo === null) {
    return null;
  }

  return state.idArticulo;
}
