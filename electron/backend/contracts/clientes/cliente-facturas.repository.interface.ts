import type CrearClienteFacturaBorradorRecordCommand from '@backend/contracts/clientes/crear-cliente-factura-borrador-record-command.interface';
import type { ClienteFacturaRecord } from '@backend/domain/clientes/cliente-factura-record.interface';
import type { ClienteFacturaVentaDisponibleRecord } from '@backend/domain/clientes/cliente-factura-venta-record.interface';

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
