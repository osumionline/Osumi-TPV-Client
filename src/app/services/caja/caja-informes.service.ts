import { Service } from '@angular/core';
import type { InformeSimpleConsulta } from '@desktop-contracts/caja/informes/informe-simple.interface';

/**
 * Expone al renderer los informes disponibles
 * en el apartado de Caja.
 */
@Service()
export default class CajaInformesService {
  /**
   * Genera el Informe Simple y abre
   * su ventana independiente de impresión.
   */
  async openSimple(consulta: InformeSimpleConsulta): Promise<void> {
    await window.osumiDesktop.caja.openInformeSimple(consulta);
  }
}
