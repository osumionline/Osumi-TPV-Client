import type { ImprentaPrintDocumentoInterface } from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';

export default interface ImprentaPrintWindow {
  /**
   * Abre la hoja canónica en una BrowserWindow independiente.
   */
  open(documento: ImprentaPrintDocumentoInterface): Promise<void>;

  /**
   * Obtiene el snapshot únicamente para el renderer autorizado.
   */
  getDocumento(senderWebContentsId: number): ImprentaPrintDocumentoInterface;

  /**
   * Abre el diálogo estándar de impresión desde
   * la BrowserWindow autorizada.
   */
  print(senderWebContentsId: number): Promise<void>;
}
