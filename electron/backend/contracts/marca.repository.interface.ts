import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';

export default interface MarcaRepository {
  findAll(): Promise<readonly MarcaRecord[]>;
}
