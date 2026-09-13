export type PedidoArchivoTipo = 'albaran' | 'factura' | 'abono' | 'documento' | 'otro';

/**
 * Describe un PDF gestionado y relacionado
 * con un Pedido.
 */
export interface PedidoArchivoInterface {
  readonly id: number;
  readonly publicId: string;
  readonly tipo: PedidoArchivoTipo;
  readonly nombre: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}
