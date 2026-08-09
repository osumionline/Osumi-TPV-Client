import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import type { DataSource } from 'typeorm';

interface MarcaDatabaseRow {
  readonly id: number;

  readonly public_id: string;

  readonly nombre: string;

  readonly direccion: string | null;

  readonly telefono: string | null;

  readonly email: string | null;

  readonly web: string | null;

  readonly observaciones: string | null;

  readonly foto_relative_path: string | null;
}

export default class TypeOrmMarcaRepository implements MarcaRepository {
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  async findAll(): Promise<readonly MarcaRecord[]> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    const rows: readonly MarcaDatabaseRow[] = (await dataSource.query(
      `
            SELECT
              m.id,
              m.public_id,
              m.nombre,
              m.direccion,
              m.telefono,
              m.email,
              m.web,
              m.observaciones,
              a.relative_path
                AS foto_relative_path
            FROM marca m
            LEFT JOIN archivo a
              ON a.id = m.id_archivo
              AND a.deleted_at IS NULL
            WHERE
              m.deleted_at IS NULL
            ORDER BY
              m.nombre COLLATE NOCASE,
              m.id
          `,
    )) as readonly MarcaDatabaseRow[];

    return rows.map((row: MarcaDatabaseRow): MarcaRecord => ({
      id: row.id,
      publicId: row.public_id,
      nombre: row.nombre,
      direccion: row.direccion,
      fotoRelativePath: row.foto_relative_path,
      telefono: row.telefono,
      email: row.email,
      web: row.web,
      observaciones: row.observaciones,
    }));
  }
}
