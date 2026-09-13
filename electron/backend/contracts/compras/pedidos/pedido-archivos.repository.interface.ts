import type PedidoArchivoCreateRecord from '@backend/domain/compras/pedidos/pedido-archivo-create-record.interface';
import type { PedidoArchivoRecord } from '@backend/domain/compras/pedidos/pedido-archivo-record.interface';
import type {
  PedidoArchivoDeleteResultRecord,
  PedidoArchivoResourceRecord,
} from '@backend/domain/compras/pedidos/pedido-archivo-resource-record.interface';

/**
 * Define las operaciones de persistencia necesarias
 * para gestionar archivos relacionados con Pedidos.
 */
export default interface PedidoArchivosRepository {
  createPedidoArchivo(command: PedidoArchivoCreateRecord): Promise<PedidoArchivoRecord>;

  /**
   * Resuelve el recurso físico de una relación
   * perteneciente exactamente a un Pedido.
   */
  getPedidoArchivoResource(
    idPedido: number,
    idPedidoArchivo: number,
  ): Promise<PedidoArchivoResourceRecord | null>;

  /**
   * Elimina una relación y decide si el archivo
   * físico ha quedado completamente huérfano.
   */
  deletePedidoArchivo(
    idPedido: number,
    idPedidoArchivo: number,
  ): Promise<PedidoArchivoDeleteResultRecord>;
}
