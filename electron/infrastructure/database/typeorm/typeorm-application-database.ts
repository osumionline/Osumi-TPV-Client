import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import type { DataSource } from 'typeorm';

export default class TypeOrmApplicationDatabase {
  private dataSource: DataSource | null = null;

  private pendingConnection: Promise<DataSource> | null = null;

  constructor(
    private readonly databaseFile: string,
    private readonly dataSourceFactory: TypeOrmDataSourceFactory,
  ) {}

  connect(): Promise<DataSource> {
    const currentDataSource: DataSource | null = this.dataSource;

    if (currentDataSource !== null && currentDataSource.isInitialized) {
      return Promise.resolve(currentDataSource);
    }

    if (this.pendingConnection !== null) {
      return this.pendingConnection;
    }

    this.pendingConnection = this.initialize();

    return this.pendingConnection;
  }

  async disconnect(): Promise<void> {
    const pendingConnection: Promise<DataSource> | null = this.pendingConnection;

    if (pendingConnection !== null) {
      try {
        await pendingConnection;
      } catch {
        return;
      }
    }

    const currentDataSource: DataSource | null = this.dataSource;

    this.dataSource = null;

    if (currentDataSource === null || !currentDataSource.isInitialized) {
      return;
    }

    await currentDataSource.destroy();
  }

  private async initialize(): Promise<DataSource> {
    const dataSource: DataSource = this.dataSourceFactory.create(this.databaseFile);

    try {
      await dataSource.initialize();

      this.dataSource = dataSource;

      return dataSource;
    } catch (error: unknown) {
      if (dataSource.isInitialized) {
        try {
          await dataSource.destroy();
        } catch (destroyError: unknown) {
          console.error('No se ha podido cerrar la conexión SQLite fallida:', destroyError);
        }
      }

      throw new Error('No se ha podido abrir la base de datos de la aplicación.', {
        cause: error,
      });
    } finally {
      this.pendingConnection = null;
    }
  }
}
