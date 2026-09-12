/**
 * Representa una línea de Pedido ya normalizada
 * para su persistencia.
 */
export default interface PedidoLineaSaveRecord {
  readonly id: number | null;
  readonly idArticulo: number | null;
  readonly orden: number;
  readonly codigoBarras: string | null;
  readonly unidades: number;
  readonly palbMicros: number;
  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly margenMicroporcentaje: number;
  readonly ivaBps: number;
  readonly recargoEquivalenciaBps: number;
  readonly descuentoBps: number;
}
