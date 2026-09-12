/**
 * Representa una pareja fiscal IVA/RE disponible
 * para las líneas de un Pedido.
 */
export default interface PurchaseOrderTaxPair {
  readonly ivaBps: number;
  readonly recargoEquivalenciaBps: number;
}
