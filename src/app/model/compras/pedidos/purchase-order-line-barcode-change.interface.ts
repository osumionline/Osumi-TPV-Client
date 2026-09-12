/**
 * Describe un cambio del código de barras adicional
 * pendiente de una línea de Pedido.
 */
export default interface PurchaseOrderLineBarcodeChange {
  readonly lineKey: string;
  readonly codigoBarras: string | null;
}
