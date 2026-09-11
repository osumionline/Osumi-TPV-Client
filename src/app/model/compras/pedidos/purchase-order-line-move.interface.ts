/**
 * Describe un movimiento de una línea dentro del Pedido.
 */
export default interface PurchaseOrderLineMove {
  readonly lineKey: string;
  readonly direction: 'up' | 'down';
}
