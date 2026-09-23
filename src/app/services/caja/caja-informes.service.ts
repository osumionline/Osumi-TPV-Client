import { Service } from '@angular/core';
import type {
  InformeSimpleConsulta,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';

/**
 * Expone al renderer los informes disponibles
 * en el apartado de Caja.
 */
@Service()
export default class CajaInformesService {
  /**
   * Obtiene el Informe Simple del periodo seleccionado.
   */
  async getSimple(consulta: InformeSimpleConsulta): Promise<InformeSimpleResultado> {
    return window.osumiDesktop.caja.getInformeSimple(consulta);
  }
}
