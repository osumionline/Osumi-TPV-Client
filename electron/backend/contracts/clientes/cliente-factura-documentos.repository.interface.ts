import type { ClienteFacturaDocumentoRecord } from '@backend/domain/clientes/cliente-factura-documento-record.interface';

export default interface ClienteFacturaDocumentosRepository {
  /**
   * Recupera el snapshot documental completo de una
   * factura perteneciente al cliente indicado.
   */
  findDocumentoByPublicId(
    clientePublicId: string,
    facturaPublicId: string,
  ): Promise<ClienteFacturaDocumentoRecord | null>;
}
