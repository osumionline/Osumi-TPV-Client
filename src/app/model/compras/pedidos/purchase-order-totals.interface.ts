/**
 * Contiene el desglose fiscal de una base económica
 * concreta dentro de un Pedido.
 */
export interface PurchaseOrderTaxBreakdown {
  readonly ivaBps: number;
  readonly recargoEquivalenciaBps: number;
  readonly baseMicros: number;
  readonly ivaMicros: number;
  readonly recargoEquivalenciaMicros: number;
}

/**
 * Contiene todos los totales económicos calculados
 * para un Pedido.
 */
export interface PurchaseOrderTotals {
  readonly totalLineas: number;
  readonly totalArticulos: number;
  readonly totalBeneficiosMicros: number;
  readonly totalPvpMicros: number;
  readonly portesMicros: number;
  readonly mediaMargenMicroporcentaje: number;
  readonly subtotalMicros: number;
  readonly descuentoGlobalBps: number;
  readonly ivaMicros: number;
  readonly recargoEquivalenciaMicros: number;
  readonly desgloseFiscal: readonly PurchaseOrderTaxBreakdown[];
  readonly totalFacturaMicros: number;
  readonly totalSinIvaMicros: number;
}
