import type PedidoArchivoStoredRecord from '@backend/domain/compras/pedidos/pedido-archivo-stored-record.interface';

/**
 * Gestiona los PDFs físicos asociados a Pedidos.
 */
export default interface PedidoArchivoStorage {
  save(publicId: string, sourcePath: string): Promise<PedidoArchivoStoredRecord>;

  remove(publicId: string): Promise<void>;
}
