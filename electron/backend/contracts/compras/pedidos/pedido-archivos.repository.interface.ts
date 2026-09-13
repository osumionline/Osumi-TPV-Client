import type PedidoArchivoCreateRecord from '@backend/domain/compras/pedidos/pedido-archivo-create-record.interface';
import type { PedidoArchivoRecord } from '@backend/domain/compras/pedidos/pedido-archivo-record.interface';

/**
 * Define las operaciones de persistencia necesarias
 * para gestionar archivos relacionados con Pedidos.
 */
export default interface PedidoArchivosRepository {
  createPedidoArchivo(command: PedidoArchivoCreateRecord): Promise<PedidoArchivoRecord>;
}
