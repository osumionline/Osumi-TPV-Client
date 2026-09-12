/**
 * Describe un cambio fiscal realizado sobre
 * una línea editable de Pedido.
 */
export default interface PurchaseOrderLineTaxChange {
  readonly lineKey: string;
  readonly field: 'ivaBps' | 'recargoEquivalenciaBps';
  readonly value: number;
}
