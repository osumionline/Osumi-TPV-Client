import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';

export default interface CajaApi {
  open(command: AbrirCajaCommand): Promise<CajaAbiertaInterface>;
}
