import type ArchivosRepository from '@backend/contracts/files/archivos.repository.interface';
import type {
  ArchivoCreateRecord,
  ArchivoRecord,
} from '@backend/domain/files/archivo-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import type { DataSource, QueryRunner } from 'typeorm';

interface DatabaseIdRow {
  readonly id: number;
}

/**
 * Persiste los metadatos de archivos gestionados
 * dentro de la base de datos principal.
 */
export default class TypeOrmArchivosRepository implements ArchivosRepository {
  /**
   * Crea el repository sobre la base de datos principal.
   */
  constructor(private readonly applicationDatabase: TypeOrmApplicationDatabase) {}

  /**
   * Registra un archivo dentro de una transacción SQLite.
   */
  async create(command: ArchivoCreateRecord): Promise<ArchivoRecord> {
    const dataSource: DataSource = await this.applicationDatabase.connect();

    return runDataSourceTransaction(
      dataSource,
      async (queryRunner: QueryRunner): Promise<ArchivoRecord> => {
        await queryRunner.query(
          `
            INSERT INTO archivo (
              public_id,
              purpose,
              original_name,
              internal_name,
              relative_path,
              mime_type,
              size_bytes,
              sha256,
              width,
              height
            )
            VALUES (
              ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
            )
          `,
          [
            command.publicId,
            command.purpose,
            command.originalName,
            command.internalName,
            command.relativePath,
            command.mimeType,
            command.sizeBytes,
            command.sha256,
            command.width,
            command.height,
          ],
        );

        const id: number = await this.readLastInsertedId(queryRunner);

        return {
          id,
          ...command,
        };
      },
    );
  }

  /**
   * Obtiene el identificador autoincremental
   * insertado en la conexión actual.
   */
  private async readLastInsertedId(queryRunner: QueryRunner): Promise<number> {
    const rows: readonly DatabaseIdRow[] = (await queryRunner.query(
      `
          SELECT last_insert_rowid() AS id
        `,
    )) as readonly DatabaseIdRow[];

    const id: number | undefined = rows[0]?.id;

    if (id === undefined) {
      throw new Error('No se ha podido obtener el id del archivo creado.');
    }

    return id;
  }
}
