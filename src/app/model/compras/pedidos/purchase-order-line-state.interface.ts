import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';

/**
 * Representa una línea de Pedido dentro del estado editable
 * del renderer, esté ya persistida o sea todavía nueva.
 */
export default interface PurchaseOrderLineState extends Omit<
  PedidoLineaInterface,
  'id' | 'publicId'
> {
  readonly key: string;
  readonly id: number | null;
  readonly publicId: string | null;
}
