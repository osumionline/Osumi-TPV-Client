import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';

/**
 * Ejecuta las operaciones de negocio relacionadas con la caja.
 */
export default class CajaService {
  constructor(private readonly cajaRepository: CajaRepository) {}

  /**
   * Abre la caja del terminal indicado o devuelve la que ya estuviese abierta.
   */
  async open(command: AbrirCajaCommand): Promise<CajaAbiertaInterface> {
    if (command.terminalPublicId.trim().length === 0) {
      throw new Error('El terminal indicado no es válido.');
    }

    const caja: CajaAbiertaRecord = await this.cajaRepository.open({
      terminalPublicId: command.terminalPublicId.trim(),
    });

    return {
      id: caja.id,
      publicId: caja.publicId,
      idTerminal: caja.idTerminal,
      apertura: caja.apertura,
      importeAperturaCents: caja.importeAperturaCents,
    };
  }
}
