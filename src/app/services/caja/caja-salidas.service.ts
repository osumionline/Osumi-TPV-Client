import { Service } from '@angular/core';
import type {
  SalidaCajaConsulta,
  SalidaCajaInterface,
} from '@desktop-contracts/caja/salida-caja.interface';

/**
 * Expone al renderer las consultas de salidas de caja.
 */
@Service()
export default class CajaSalidasService {
  /**
   * Recupera las salidas del periodo civil indicado.
   */
  async getSalidas(consulta: SalidaCajaConsulta): Promise<readonly SalidaCajaInterface[]> {
    return window.osumiDesktop.caja.getSalidas(consulta);
  }
}
