import InitialSchema2026072700000 from '@infrastructure/database/typeorm/migrations/2026072700000-initial-schema.migration';
import cajaSchema from '@infrastructure/database/typeorm/schemas/caja.schema';
import empleadoPermisoSchema from '@infrastructure/database/typeorm/schemas/empleado-permiso.schema';
import empleadoSchema from '@infrastructure/database/typeorm/schemas/empleado.schema';
import { DataSource } from 'typeorm';

export default class TypeOrmDataSourceFactory {
  create(databaseFile: string): DataSource {
    return new DataSource({
      type: 'better-sqlite3',
      database: databaseFile,

      entities: [empleadoSchema, empleadoPermisoSchema, cajaSchema],

      migrations: [InitialSchema2026072700000],

      migrationsTableName: 'migration',
      migrationsRun: false,
      synchronize: false,
      logging: false,

      enableWAL: true,
      timeout: 5000,
    });
  }
}
