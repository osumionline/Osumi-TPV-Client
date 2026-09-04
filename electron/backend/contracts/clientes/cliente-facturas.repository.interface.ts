import type { ClienteFacturaRecord } from '@backend/domain/clientes/cliente-factura-record.interface';

export default interface ClienteFacturasRepository {
  /**
   * Recupera las facturas visibles de un cliente activo,
   * ordenadas desde la más reciente.
   */
  findByClientePublicId(publicId: string): Promise<readonly ClienteFacturaRecord[]>;
}
