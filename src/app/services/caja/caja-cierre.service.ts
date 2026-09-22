import { Service } from '@angular/core';
import {
  type CajaCierreInterface,
  CajaCierreConsulta,
} from '@desktop-contracts/caja/caja-cierre.interface';
import type { CerrarCajaCommand } from '@desktop-contracts/caja/cerrar-caja-command.interface';

/**
 * Expone al renderer la lectura económica necesaria
 * para preparar el cierre de una caja.
 */
@Service()
export default class CajaCierreService {
  /**
   * Recupera el snapshot canónico de una caja abierta.
   */
  getCierre(consulta: CajaCierreConsulta): Promise<CajaCierreInterface> {
    return window.osumiDesktop.caja.getCierre(consulta);
  }

  /**
   * Cierra definitivamente una caja.
   */
  close(command: CerrarCajaCommand): Promise<void> {
    return window.osumiDesktop.caja.close(command);
  }
}
