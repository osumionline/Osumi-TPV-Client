import type { ClienteFacturaDocumentoConsulta } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';

export default interface ClienteFacturaPreviewWindow {
  /**
   * Abre una previsualización y resuelve cuando
   * la ventana termina su ciclo de vida.
   */
  open(consulta: ClienteFacturaDocumentoConsulta): Promise<ClienteFacturaInterface | null>;

  /**
   * Obtiene el contexto asociado exclusivamente
   * al renderer autorizado de la preview.
   */
  getConsulta(senderWebContentsId: number): ClienteFacturaDocumentoConsulta;

  /**
   * Registra que la preview ha emitido definitivamente
   * su borrador durante esta sesión.
   */
  markEmitted(senderWebContentsId: number, factura: ClienteFacturaInterface): void;
}
