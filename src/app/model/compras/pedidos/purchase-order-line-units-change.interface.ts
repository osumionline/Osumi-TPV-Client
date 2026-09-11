/**
 * Describe un cambio de unidades realizado sobre
 * una línea editable de Pedido.
 */
export default interface PurchaseOrderLineUnitsChange {
  readonly lineKey: string;
  readonly unidades: number;
}
