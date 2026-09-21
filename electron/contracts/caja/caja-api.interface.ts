import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
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
}
