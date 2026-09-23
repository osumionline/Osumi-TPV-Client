import type { CajaInformePrintDocumento } from '@desktop-contracts/caja/informes/caja-informe-print.interface';

export default interface CajaInformePrintApi {
  /**
   * Obtiene el snapshot asociado exclusivamente
   * a esta ventana de informe.
   */
  getDocumento(): Promise<CajaInformePrintDocumento>;

  /**
   * Abre el diálogo estándar de impresión del sistema.
   */
  print(): Promise<void>;
}
