import type ActualizarClienteFacturaBorradorRecordCommand from '@backend/contracts/clientes/actualizar-cliente-factura-borrador-record-command.interface';
import type CrearClienteFacturaBorradorRecordCommand from '@backend/contracts/clientes/crear-cliente-factura-borrador-record-command.interface';
import type EliminarClienteFacturaBorradorRecordCommand from '@backend/contracts/clientes/eliminar-cliente-factura-borrador-record-command.interface';
import type { ClienteFacturaRecord } from '@backend/domain/clientes/cliente-factura-record.interface';
import type {
  ClienteFacturaVentaDisponibleRecord,
  ClienteFacturaVentaRecord,
} from '@backend/domain/clientes/cliente-factura-venta-record.interface';

export default interface ClienteFacturasRepository {
  /**
   * Recupera las facturas visibles de un cliente activo,
   * ordenadas desde la más reciente.
   */
  findByClientePublicId(publicId: string): Promise<readonly ClienteFacturaRecord[]>;

  /**
   * Crea un borrador revalidando y relacionando
   * sus ventas dentro de una única transacción.
   */
  createBorrador(command: CrearClienteFacturaBorradorRecordCommand): Promise<ClienteFacturaRecord>;

  /**
   * Actualiza un borrador y sincroniza sus ventas
   * dentro de una única transacción.
   */
  updateBorrador(
    command: ActualizarClienteFacturaBorradorRecordCommand,
  ): Promise<ClienteFacturaRecord>;

  /**
   * Elimina lógicamente un borrador y borra todas
   * sus relaciones dentro de una única transacción.
   */
  deleteBorrador(command: EliminarClienteFacturaBorradorRecordCommand): Promise<void>;
  /**
   * Recupera las ventas relacionadas históricamente
   * con una factura visible del cliente.
   */

  findVentasByFacturaPublicId(
    clientePublicId: string,
    facturaPublicId: string,
  ): Promise<readonly ClienteFacturaVentaRecord[]>;

  /**
   * Recupera las ventas elegibles para una factura.
   *
   * Si se indica un borrador, sus relaciones activas no bloquean
   * las ventas y estas se marcan como ya incluidas.
   */
  findVentasDisponibles(
    clientePublicId: string,
    borradorPublicId: string | null,
  ): Promise<readonly ClienteFacturaVentaDisponibleRecord[]>;
}
