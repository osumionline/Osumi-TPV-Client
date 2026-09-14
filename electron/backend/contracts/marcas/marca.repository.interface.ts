import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';

export default interface MarcaRepository {
  findAll(): Promise<readonly MarcaRecord[]>;

  findById(id: number): Promise<MarcaRecord | null>;

  existsActiveByName(nombre: string, excludeId: number | null): Promise<boolean>;

  create(command: CrearMarcaRecordCommand): Promise<MarcaRecord>;

  update(id: number, command: ActualizarMarcaRecordCommand): Promise<MarcaRecord>;

  deactivate(id: number): Promise<void>;
}
