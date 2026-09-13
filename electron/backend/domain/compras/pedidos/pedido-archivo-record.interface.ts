export type PedidoArchivoTipoRecord = 'albaran' | 'factura' | 'abono' | 'documento' | 'otro';

/**
 * Representa la metadata persistida de un PDF
 * relacionado con un Pedido.
 */
export interface PedidoArchivoRecord {
  readonly id: number;
  readonly publicId: string;
  readonly idArchivo: number;
  readonly tipo: PedidoArchivoTipoRecord;
  readonly nombre: string;
  readonly mimeType: string;
  readonly sizeBytes: number;
  readonly createdAt: string;
}
