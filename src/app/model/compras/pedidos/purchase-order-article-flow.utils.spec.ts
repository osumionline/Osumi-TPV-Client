import type PurchaseOrderArticleFlowState from '@model/compras/pedidos/purchase-order-article-flow.interface';
import {
  getPurchaseOrderReturnedArticleId,
  parsePurchaseOrderArticleFlowState,
} from '@model/compras/pedidos/purchase-order-article-flow.utils';
import { describe, expect, it } from 'vitest';

describe('purchase-order-article-flow.utils', (): void => {
  it('acepta un contexto válido de creación', (): void => {
    expect(
      parsePurchaseOrderArticleFlowState({
        idPedido: 355,
        idArticulo: null,
      }),
    ).toEqual({
      idPedido: 355,
      idArticulo: null,
    });
  });

  it('acepta un retorno con artículo persistido', (): void => {
    expect(
      parsePurchaseOrderArticleFlowState({
        idPedido: 355,
        idArticulo: 987,
      }),
    ).toEqual({
      idPedido: 355,
      idArticulo: 987,
    });
  });

  it('rechaza contextos incompletos o identificadores inválidos', (): void => {
    expect(parsePurchaseOrderArticleFlowState(null)).toBeNull();

    expect(
      parsePurchaseOrderArticleFlowState({
        idPedido: 0,
        idArticulo: null,
      }),
    ).toBeNull();

    expect(
      parsePurchaseOrderArticleFlowState({
        idPedido: 355,
      }),
    ).toBeNull();

    expect(
      parsePurchaseOrderArticleFlowState({
        idPedido: 355,
        idArticulo: -1,
      }),
    ).toBeNull();
  });

  it('solo devuelve el artículo cuando pertenece al Pedido actual', (): void => {
    const state: PurchaseOrderArticleFlowState = {
      idPedido: 355,
      idArticulo: 987,
    };

    expect(getPurchaseOrderReturnedArticleId(state, 355)).toBe(987);

    expect(getPurchaseOrderReturnedArticleId(state, 356)).toBeNull();
  });
});
