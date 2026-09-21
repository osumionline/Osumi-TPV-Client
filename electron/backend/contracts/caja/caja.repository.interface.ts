import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type SalidaCajaRecord from '@backend/domain/caja/salida-caja-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';

export default interface CajaRepository {
  open(command: AbrirCajaCommand): Promise<CajaAbiertaRecord>;

  /**
   * Recupera las salidas de caja de un intervalo temporal absoluto.
   *
   * El límite inicial es inclusivo y el final exclusivo.
   */
  findSalidasByPeriod(desde: string, hastaExclusive: string): Promise<readonly SalidaCajaRecord[]>;
}
