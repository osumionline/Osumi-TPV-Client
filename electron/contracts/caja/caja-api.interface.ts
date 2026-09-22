import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import {
  type CajaCierreInterface,
  CajaCierreConsulta,
} from '@desktop-contracts/caja/caja-cierre.interface';
import type { CerrarCajaCommand } from '@desktop-contracts/caja/cerrar-caja-command.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import type {
  SalidaCajaConsulta,
  SalidaCajaInterface,
} from '@desktop-contracts/caja/salida-caja.interface';

export default interface CajaApi {
  open(command: AbrirCajaCommand): Promise<CajaAbiertaInterface>;

  /**
   * Recupera las salidas de caja del periodo indicado.
   */
  getSalidas(consulta: SalidaCajaConsulta): Promise<readonly SalidaCajaInterface[]>;

  /**
   * Crea una salida en la caja activa.
   */
  createSalida(command: CrearSalidaCajaCommand): Promise<SalidaCajaInterface>;

  /**
   * Actualiza una salida de la caja activa.
   */
  updateSalida(command: ActualizarSalidaCajaCommand): Promise<SalidaCajaInterface>;

  /**
   * Elimina lógicamente una salida de la caja activa.
   */
  deleteSalida(command: EliminarSalidaCajaCommand): Promise<void>;

  /**
   * Obtiene el snapshot económico de una caja abierta.
   */
  getCierre(consulta: CajaCierreConsulta): Promise<CajaCierreInterface>;

  /**
   * Cierra definitivamente una caja abierta.
   */
  close(command: CerrarCajaCommand): Promise<void>;
}
