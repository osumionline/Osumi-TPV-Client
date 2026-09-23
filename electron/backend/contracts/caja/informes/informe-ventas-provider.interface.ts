import type {
  InformeVentasConsulta,
  InformeVentasResultado,
} from '@desktop-contracts/caja/informes/informe-ventas.interface';

export default interface InformeVentasProvider {
  /**
   * Genera el Informe de Ventas correspondiente
   * a la categoría y periodo indicados.
   */
  getInforme(consulta: InformeVentasConsulta): Promise<InformeVentasResultado>;
}
