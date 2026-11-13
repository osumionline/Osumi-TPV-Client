import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmVentasArticulosRepository from '@infrastructure/database/typeorm/typeorm-ventas-articulos.repository';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let database: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmVentasArticulosRepository | null = null;

/**
 * Recupera el repositorio preparado para la prueba.
 */
function requireRepository(): TypeOrmVentasArticulosRepository {
  if (repository === null) {
    throw new Error('El repositorio de pruebas no está disponible.');
  }
  return repository;
}

/**
 * Recupera la conexión de pruebas.
 */
async function requireDatabase(): Promise<DataSource> {
  if (database === null) {
    throw new Error('La base de datos de pruebas no está disponible.');
  }
  return database.connect();
}

describe('TypeOrmVentasArticulosRepository - tienda online', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'tpv-online-articulos-'));

    database = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'articulos.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await database.connect();

    for (const schema of completeDatabaseSchema) {
      for (const statement of schema.statements) {
        await dataSource.query(statement);
      }
    }

    await dataSource.query(`
      INSERT INTO marca (id, public_id, nombre)
      VALUES (1, 'marca-online', 'Marca online')
    `);

    await dataSource.query(`
      INSERT INTO articulo (
        id, public_id, localizador, nombre,
        slug, id_marca, acceso_directo
      )
      VALUES
        (1, 'articulo-123', 123, 'Artículo A', 'articulo-a', 1, 12),
        (2, 'articulo-456', 456, 'Artículo B', 'articulo-b', 1, 34)
    `);

    repository = new TypeOrmVentasArticulosRepository(database);
  });

  afterEach(async (): Promise<void> => {
    if (database !== null) {
      await database.disconnect();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    repository = null;
    database = null;
    tempDirectory = null;
  });

  it('busca exclusivamente por localizador', async (): Promise<void> => {
    const repo = requireRepository();

    const article = await repo.findByLocalizador(123);

    expect(article?.publicId).toBe('articulo-123');
    expect(article?.localizador).toBe(123);
  });

  it('no interpreta los accesos directos como localizadores', async (): Promise<void> => {
    const repo = requireRepository();

    expect(await repo.findByLocalizador(12)).toBeNull();
    expect(await repo.findByLocalizador(34)).toBeNull();

    expect((await repo.findByLocalizador(456))?.publicId).toBe('articulo-456');
  });

  it('no devuelve artículos eliminados', async (): Promise<void> => {
    const dataSource = await requireDatabase();

    await dataSource.query(`
      UPDATE articulo
      SET deleted_at = CURRENT_TIMESTAMP
      WHERE id = 1
    `);

    expect(await requireRepository().findByLocalizador(123)).toBeNull();
  });

  it('rechaza localizadores numéricos inválidos', async (): Promise<void> => {
    const repo = requireRepository();

    await expect(repo.findByLocalizador(0)).rejects.toThrow(
      'El localizador solicitado no es válido.',
    );
    await expect(repo.findByLocalizador(-1)).rejects.toThrow(
      'El localizador solicitado no es válido.',
    );
  });
});
