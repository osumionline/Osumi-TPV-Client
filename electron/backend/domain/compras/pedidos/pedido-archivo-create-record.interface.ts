import type PedidoArchivoStoredRecord from '@backend/domain/compras/pedidos/pedido-archivo-stored-record.interface';

/**
 * Contiene los datos necesarios para registrar un PDF
 * ya almacenado y relacionarlo con un Pedido.
 */
export default interface PedidoArchivoCreateRecord {
  readonly idPedido: number;
  readonly archivoPublicId: string;
  readonly relacionPublicId: string;
  readonly storedFile: PedidoArchivoStoredRecord;
}
