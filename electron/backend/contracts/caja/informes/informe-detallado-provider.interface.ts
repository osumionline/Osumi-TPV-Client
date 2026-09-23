import type {
  InformeDetalladoConsulta,
  InformeDetalladoResultado,
} from '@desktop-contracts/caja/informes/informe-detallado.interface';

export default interface InformeDetalladoProvider {
  /**
   * Genera el snapshot completo del Informe Detallado
   * correspondiente al periodo indicado.
   */
  getInforme(consulta: InformeDetalladoConsulta): Promise<InformeDetalladoResultado>;
}
