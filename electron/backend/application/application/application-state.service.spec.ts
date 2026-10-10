import ApplicationStateService from '@backend/application/application/application-state.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import completeDatabaseSchemaTables from '@infrastructure/database/schema/complete-database-schema.tables';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;

describe('ApplicationStateService', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-application-state-'));
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('devuelve not-installed sin registrar una incidencia cuando no existe instalación', async (): Promise<void> => {
    const applicationLogger = new TestApplicationLogger();

    const service: ApplicationStateService = createService(applicationLogger);

    await expect(service.getState()).resolves.toEqual({
      state: 'not-installed',
      reason: 'database-not-found',
    });

    expect(applicationLogger.errorEvents).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra una base de datos existente que no supera la validación', async (): Promise<void> => {
    const directory: string = requireTempDirectory();
    const databaseFile: string = join(directory, 'osumi-tpv.sqlite');

    const dataSourceFactory = new TypeOrmDataSourceFactory();
    const dataSource: DataSource = dataSourceFactory.create(databaseFile);

    await dataSource.initialize();
    await dataSource.destroy();

    await writeFile(join(directory, 'app_data.json'), '{}', {
      encoding: 'utf8',
    });

    const applicationLogger = new TestApplicationLogger();

    const service: ApplicationStateService = createService(applicationLogger);

    await expect(service.getState()).resolves.toEqual({
      state: 'invalid',
      reason: 'database-invalid',
    });

    expect(applicationLogger.errorEvents).toHaveLength(1);

    expect(applicationLogger.errorEvents[0]).toMatchObject({
      area: 'database',
      operation: 'validate-application-database',
      message: 'La base de datos de la aplicación no ha superado la validación.',
      error: expect.any(Error),
    });
  });
});

/**
 * Crea el servicio con infraestructura real sobre
 * el directorio temporal de cada prueba.
 */
function createService(applicationLogger: ApplicationLogger): ApplicationStateService {
  const directory: string = requireTempDirectory();

  return new ApplicationStateService(
    join(directory, 'osumi-tpv.sqlite'),
    join(directory, 'app_data.json'),
    new TypeOrmDataSourceFactory(),
    new DatabaseSchemaService(completeDatabaseSchema, completeDatabaseSchemaTables),
    applicationLogger,
  );
}

/**
 * Devuelve el directorio temporal preparado
 * para la prueba actual.
 */
function requireTempDirectory(): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal del test no está disponible.');
  }

  return tempDirectory;
}

/**
 * Logger controlado utilizado por las pruebas
 * del estado de aplicación.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];
  readonly errorEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los avisos recibidos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Conserva los errores recibidos.
   */
  error(event: ApplicationLogEvent): void {
    this.errorEvents.push(event);
  }

  /**
   * No existen escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}
