import type {
  InformeSimpleConsulta,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';

export default interface InformeSimpleProvider {
  /**
   * Genera el snapshot completo del Informe Simple
   * correspondiente al periodo indicado.
   */
  getInforme(consulta: InformeSimpleConsulta): Promise<InformeSimpleResultado>;
}
