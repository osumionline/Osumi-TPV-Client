import type { CajaInformePrintDocumento } from '@desktop-contracts/caja/informes/caja-informe-print.interface';

export default interface CajaInformePrintWindow {
  /**
   * Abre una ventana independiente con el snapshot indicado.
   */
  open(documento: CajaInformePrintDocumento): Promise<void>;

  /**
   * Obtiene el documento únicamente para
   * el renderer autorizado de la ventana.
   */
  getDocumento(senderWebContentsId: number): CajaInformePrintDocumento;

  /**
   * Abre el diálogo estándar de impresión
   * desde el renderer autorizado.
   */
  print(senderWebContentsId: number): Promise<void>;
}
