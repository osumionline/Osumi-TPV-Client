import type { CaducidadReportInterface } from '@desktop-contracts/almacen/caducidades/caducidad-report.interface';

export default interface CaducidadReportWindow {
  /**
   * Abre una ventana independiente con el snapshot indicado.
   */
  open(documento: CaducidadReportInterface): Promise<void>;

  /**
   * Obtiene el documento únicamente para el renderer autorizado.
   */
  getDocumento(senderWebContentsId: number): CaducidadReportInterface;

  /**
   * Abre el diálogo estándar de impresión desde el renderer autorizado.
   */
  print(senderWebContentsId: number): Promise<void>;
}
