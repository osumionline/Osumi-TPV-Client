/**
 * Contiene el estado persistible de una línea
 * editable de Pedido.
 */
export default interface PedidoLineaSaveCommand {
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
