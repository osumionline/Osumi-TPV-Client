import type {
  InventarioReportConsulta,
  InventarioReportInterface,
} from '@desktop-contracts/almacen/inventario-report.interface';

export default interface InventarioReportProvider {
  /**
   * Recupera el snapshot persistido completo de Inventario.
   */
  getInventarioReport(consulta: InventarioReportConsulta): Promise<InventarioReportInterface>;
}
