import type {
  CaducidadReportConsulta,
  CaducidadReportInterface,
} from '@desktop-contracts/almacen/caducidad-report.interface';

export default interface CaducidadReportProvider {
  /**
   * Recupera el snapshot persistido agregado de Caducidades.
   */
  getCaducidadReport(consulta: CaducidadReportConsulta): Promise<CaducidadReportInterface>;
}
