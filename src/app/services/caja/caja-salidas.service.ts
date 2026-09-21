import { Service } from '@angular/core';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
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

  /**
   * Crea una salida en la caja activa.
   */
  async createSalida(command: CrearSalidaCajaCommand): Promise<SalidaCajaInterface> {
    return window.osumiDesktop.caja.createSalida(command);
  }

  /**
   * Actualiza una salida de la caja activa.
   */
  async updateSalida(command: ActualizarSalidaCajaCommand): Promise<SalidaCajaInterface> {
    return window.osumiDesktop.caja.updateSalida(command);
  }

  /**
   * Elimina lógicamente una salida de la caja activa.
   */
  async deleteSalida(command: EliminarSalidaCajaCommand): Promise<void> {
    await window.osumiDesktop.caja.deleteSalida(command);
  }
}
