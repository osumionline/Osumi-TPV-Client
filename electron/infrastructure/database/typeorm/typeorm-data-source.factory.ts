import { DataSource } from 'typeorm';

export default class TypeOrmDataSourceFactory {
  /**
   * Crea una conexión operativa de lectura/escritura
   * utilizando WAL.
   */
  create(databaseFile: string): DataSource {
    return new DataSource({
      type: 'better-sqlite3',
      database: databaseFile,

      synchronize: false,
      migrationsRun: false,
      logging: ['error'],

      entities: [],
      migrations: [],

      enableWAL: true,
      timeout: 5000,
    });
  }

  /**
   * Crea una conexión estrictamente de solo lectura
   * para validar una base SQLite ya existente.
   */
  createReadonly(databaseFile: string): DataSource {
    return new DataSource({
      type: 'better-sqlite3',
      database: databaseFile,

      synchronize: false,
      migrationsRun: false,
      logging: ['error'],

      entities: [],
      migrations: [],

      readonly: true,
      fileMustExist: true,
      enableWAL: false,
      timeout: 5000,
    });
  }
}
