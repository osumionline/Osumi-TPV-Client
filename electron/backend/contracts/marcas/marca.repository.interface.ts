import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';

export default interface MarcaRepository {
  findAll(): Promise<readonly MarcaRecord[]>;
  create(command: CrearMarcaRecordCommand): Promise<MarcaRecord>;
}
