import type { CaducidadReportInterface } from '@desktop-contracts/almacen/caducidad-report.interface';

export default interface CaducidadReportApi {
  /**
   * Obtiene el snapshot asociado exclusivamente a esta ventana.
   */
  getDocumento(): Promise<CaducidadReportInterface>;
}
