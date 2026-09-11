/**
 * Contiene los datos canónicos de un artículo necesarios
 * para incorporarlo a un Pedido.
 */
export default interface PedidoArticuloRecord {
  readonly id: number;
  readonly publicId: string;
  readonly localizador: number;
  readonly nombre: string;
  readonly referencia: string | null;
  readonly marcaNombre: string;
  readonly stock: number;
  readonly palbMicros: number;
  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly margenMicroporcentaje: number;
  readonly ivaBps: number;
  readonly recargoEquivalenciaBps: number;
  readonly tieneCodigoBarrasAdicional: boolean;
  readonly observaciones: string | null;
  readonly mostrarObservacionesPedidos: boolean;
}
