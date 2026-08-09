import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';

export default interface CajaRepository {
  open(command: AbrirCajaCommand): Promise<CajaAbiertaRecord>;
}
