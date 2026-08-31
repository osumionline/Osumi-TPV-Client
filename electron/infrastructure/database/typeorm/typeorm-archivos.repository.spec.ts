import type {
  ArchivoCreateRecord,
  ArchivoRecord,
} from '@backend/domain/files/archivo-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmArchivosRepository from '@infrastructure/database/typeorm/typeorm-archivos.repository';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmArchivosRepository | null = null;

describe('TypeOrmArchivosRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-files-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'files.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);

    repository = new TypeOrmArchivosRepository(applicationDatabase);
  });

  afterEach(async (): Promise<void> => {
    if (applicationDatabase !== null) {
      await applicationDatabase.disconnect();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    repository = null;
    applicationDatabase = null;
    tempDirectory = null;
  });

  it('registra todos los metadatos del WebP', async (): Promise<void> => {
    const command: ArchivoCreateRecord = {
      publicId: 'file-public-id',
      purpose: 'article_image',
      originalName: 'foto.jpg',
      internalName: 'file-public-id.webp',
      relativePath: 'files/articles/file-public-id.webp',
      mimeType: 'image/webp',
      sizeBytes: 12345,
      sha256: 'a'.repeat(64),
      width: 1200,
      height: 800,
    };

    const result: ArchivoRecord = await requireRepository().create(command);

    expect(result).toEqual({
      id: expect.any(Number),
      ...command,
    });

    const dataSource: DataSource = await requireDatabase().connect();

    const rows: readonly {
      readonly purpose: string;
      readonly original_name: string | null;
      readonly internal_name: string;
      readonly relative_path: string;
      readonly mime_type: string;
      readonly size_bytes: number;
      readonly sha256: string;
      readonly width: number | null;
      readonly height: number | null;
    }[] = await dataSource.query(
      `
            SELECT
              purpose,
              original_name,
              internal_name,
              relative_path,
              mime_type,
              size_bytes,
              sha256,
              width,
              height
            FROM archivo
            WHERE id = ?
          `,
      [result.id],
    );

    expect(rows[0]).toEqual({
      purpose: 'article_image',
      original_name: 'foto.jpg',
      internal_name: 'file-public-id.webp',
      relative_path: 'files/articles/file-public-id.webp',
      mime_type: 'image/webp',
      size_bytes: 12345,
      sha256: 'a'.repeat(64),
      width: 1200,
      height: 800,
    });
  });
});

/**
 * Crea el esquema completo sobre la SQLite temporal.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Devuelve el repository inicializado.
 */
function requireRepository(): TypeOrmArchivosRepository {
  if (repository === null) {
    throw new Error('El repository de archivos no está inicializado.');
  }

  return repository;
}

/**
 * Devuelve la base de datos inicializada.
 */
function requireDatabase(): TypeOrmApplicationDatabase {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de archivos no está inicializada.');
  }

  return applicationDatabase;
}
