import type { ClienteFacturaDocumentoInterface } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type ClienteFacturaPreviewEmitResult from '@desktop-contracts/clientes/cliente-factura-preview-emit-result.type';

export default interface ClienteFacturaPreviewApi {
  /**
   * Obtiene el documento correspondiente a esta ventana.
   */
  getDocumento(): Promise<ClienteFacturaDocumentoInterface>;

  /**
   * Emite el borrador y distingue expresamente
   * si el refresco documental post-COMMIT pudo completarse.
   */
  emitFactura(): Promise<ClienteFacturaPreviewEmitResult>;
}
