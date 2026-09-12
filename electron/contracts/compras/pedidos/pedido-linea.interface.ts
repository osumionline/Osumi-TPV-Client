/**
 * Representa una línea persistida de un Pedido.
 */
export default interface PedidoLineaInterface {
  readonly id: number;
  readonly publicId: string;
  readonly orden: number;
  readonly idArticulo: number | null;
  readonly localizador: number | null;
  readonly nombreArticulo: string;
  readonly referencia: string | null;
  readonly marcaNombre: string | null;
  readonly codigoBarras: string | null;
  readonly tieneCodigoBarrasAdicional: boolean;
  readonly unidades: number;
  readonly stockActual: number | null;
  readonly stockFinal: number | null;
  readonly palbMicros: number;
  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly margenMicroporcentaje: number;
  readonly ivaBps: number;
  readonly recargoEquivalenciaBps: number;
  readonly descuentoBps: number;
}
