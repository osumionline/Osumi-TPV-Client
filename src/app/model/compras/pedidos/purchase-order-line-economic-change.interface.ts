/**
 * Describe un cambio económico editable realizado
 * sobre una línea pendiente de Pedido.
 */
export default interface PurchaseOrderLineEconomicChange {
  readonly lineKey: string;
  readonly field: 'palbMicros' | 'descuentoBps' | 'pvpMicros';
  readonly value: number;
}
