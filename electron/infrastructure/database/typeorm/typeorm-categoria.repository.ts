import type CategoriaRepository from '@backend/contracts/categorias/categoria.repository.interface';
import type CategoriaRecord from '@backend/domain/categorias/categoria-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface CategoriaDatabaseRow {
  readonly id: number;
  readonly public_id: string;
  readonly id_padre: number | null;
  readonly nombre: string;
  readonly orden: number;
}

export default class TypeOrmCategoriaRepository implements CategoriaRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async findAll(): Promise<readonly CategoriaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly CategoriaDatabaseRow[] = (await dataSource.query(`
      SELECT
        c.id,
        c.public_id,
        c.id_padre,
        c.nombre,
        c.orden
      FROM categoria c
      WHERE c.deleted_at IS NULL
      ORDER BY
        c.orden,
        c.nombre COLLATE NOCASE,
        c.id
    `)) as readonly CategoriaDatabaseRow[];

    return rows.map((row: CategoriaDatabaseRow): CategoriaRecord => ({
      id: row.id,
      publicId: row.public_id,
      idPadre: row.id_padre,
      nombre: row.nombre,
      orden: row.orden,
    }));
  }
}
