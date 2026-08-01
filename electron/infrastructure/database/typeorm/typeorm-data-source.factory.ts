import { DataSource } from 'typeorm';

export default class TypeOrmDataSourceFactory {
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
}
