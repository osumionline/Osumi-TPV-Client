import type { ClienteFacturaDocumentoInterface } from '@desktop-contracts/clientes/cliente-factura-documento.interface';

export default interface ClienteFacturaPreviewApi {
  /**
   * Obtiene el documento correspondiente a esta ventana.
   */
  getDocumento(): Promise<ClienteFacturaDocumentoInterface>;

  /**
   * Emite el borrador de esta ventana y devuelve
   * su documento ya finalizado.
   */
  emitFactura(): Promise<ClienteFacturaDocumentoInterface>;
}
