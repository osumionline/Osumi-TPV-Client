import type ArchivosRepository from '@backend/contracts/files/archivos.repository.interface';
import type {
  ArchivoCreateRecord,
  ArchivoRecord,
} from '@backend/domain/files/archivo-record.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import insertArchivo from '@infrastructure/database/typeorm/typeorm-archivo.utils';
import { runDataSourceTransaction } from '@infrastructure/database/typeorm/typeorm-transaction.utils';
import type { DataSource, QueryRunner } from 'typeorm';

/**
 * Persiste los metadatos de archivos gestionados
 * en la base de datos principal.
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
        const id: number = await insertArchivo(queryRunner, command);

        return {
          id,
          ...command,
        };
      },
    );
  }
}
