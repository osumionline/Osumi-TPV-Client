import { validateOtpvV3PortableSecrets } from '@backend/application/backup/otpv-v3-contract.validator';
import type OtpvV3RequiredContentPaths from '@backend/contracts/backup/otpv-v3-required-content-paths.interface';
import type OtpvV3RequiredContentValidator from '@backend/contracts/backup/otpv-v3-required-content-validator.interface';
import { OTPV_V3_MAX_LOGO_DIMENSION } from '@backend/domain/backup/otpv-v3.constants';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import JsonAppDataRepository from '@infrastructure/filesystem/json-app-data.repository';
import { readFile } from 'node:fs/promises';
import sharp, { type Metadata } from 'sharp';
import type { DataSource, QueryRunner } from 'typeorm';

/**
 * Valida semánticamente los cuatro recursos
 * obligatorios de una restauración v3.
 */
export default class FileOtpvV3RequiredContentValidator implements OtpvV3RequiredContentValidator {
  /**
   * Crea el validador reutilizando las mismas
   * reglas SQLite que la aplicación operativa.
   */
  constructor(
    private readonly dataSourceFactory: TypeOrmDataSourceFactory,
    private readonly databaseSchemaService: DatabaseSchemaService,
  ) {}

  /**
   * Valida SQLite, app_data.json,
   * secretos portables y logo.
   */
  async validate(paths: OtpvV3RequiredContentPaths): Promise<void> {
    await this.validateDatabase(paths.databaseFile);
    await this.validateAppData(paths.appDataFile);
    await this.validatePortableSecrets(paths.portableSecretsFile);
    await this.validateLogo(paths.logoFile);
  }

  /**
   * Abre la SQLite restaurada y aplica
   * la validación completa del esquema actual.
   */
  private async validateDatabase(databaseFile: string): Promise<void> {
    const dataSource: DataSource = this.dataSourceFactory.createReadonly(databaseFile);

    let queryRunner: QueryRunner | null = null;

    try {
      await dataSource.initialize();

      queryRunner = dataSource.createQueryRunner();

      await queryRunner.connect();

      await this.databaseSchemaService.validate(queryRunner);
    } catch (error: unknown) {
      throw new Error('La base de datos incluida en la copia no es válida.', {
        cause: error,
      });
    } finally {
      await this.closeDatabaseSafely(queryRunner, dataSource);
    }
  }

  /**
   * Utiliza el mismo repositorio que la aplicación
   * para interpretar app_data.json.
   */
  private async validateAppData(appDataFile: string): Promise<void> {
    const repository: JsonAppDataRepository = new JsonAppDataRepository(appDataFile);

    let appData: AppData | null;

    try {
      appData = await repository.load();
    } catch (error: unknown) {
      throw new Error('config/app_data.json no contiene una configuración válida.', {
        cause: error,
      });
    }

    if (appData === null) {
      throw new Error('No se ha encontrado config/app_data.json.');
    }
  }

  /**
   * Valida el documento portable de secretos
   * mediante el contrato exacto v3.
   */
  private async validatePortableSecrets(secretsFile: string): Promise<void> {
    const content: Buffer = await readFile(secretsFile);

    try {
      let parsed: unknown;

      try {
        parsed = JSON.parse(content.toString('utf8')) as unknown;
      } catch (error: unknown) {
        throw new Error('secrets/secrets.json no contiene JSON válido.', {
          cause: error,
        });
      }

      validateOtpvV3PortableSecrets(parsed);
    } finally {
      content.fill(0);
    }
  }

  /**
   * Comprueba que assets/logo.webp sea realmente
   * una imagen WebP estática y válida.
   */
  private async validateLogo(logoFile: string): Promise<void> {
    let logoBuffer: Buffer;

    try {
      logoBuffer = await readFile(logoFile);
    } catch (error: unknown) {
      throw new Error('No se ha podido leer assets/logo.webp.', {
        cause: error,
      });
    }

    let metadata: Metadata;

    try {
      metadata = await sharp(logoBuffer, {
        failOn: 'error',
        limitInputPixels: 100_000_000,
      }).metadata();
    } catch (error: unknown) {
      throw new Error('assets/logo.webp no contiene una imagen válida.', {
        cause: error,
      });
    } finally {
      logoBuffer.fill(0);
    }

    if (metadata.format !== 'webp') {
      throw new Error('assets/logo.webp no contiene una imagen WebP.');
    }

    if (metadata.pages !== undefined && metadata.pages > 1) {
      throw new Error('assets/logo.webp no puede contener una imagen animada.');
    }

    const width: number = metadata.width ?? 0;
    const height: number = metadata.height ?? 0;

    if (
      width <= 0 ||
      height <= 0 ||
      width > OTPV_V3_MAX_LOGO_DIMENSION ||
      height > OTPV_V3_MAX_LOGO_DIMENSION
    ) {
      throw new Error('assets/logo.webp tiene dimensiones no válidas.');
    }
  }

  /**
   * Cierra la conexión de validación sin ocultar
   * el error que originó la salida.
   */
  private async closeDatabaseSafely(
    queryRunner: QueryRunner | null,
    dataSource: DataSource,
  ): Promise<void> {
    if (queryRunner !== null && !queryRunner.isReleased) {
      try {
        await queryRunner.release();
      } catch (error: unknown) {
        console.error('No se ha podido liberar la SQLite restaurada:', error);
      }
    }

    if (dataSource.isInitialized) {
      try {
        await dataSource.destroy();
      } catch (error: unknown) {
        console.error('No se ha podido cerrar la SQLite restaurada:', error);
      }
    }
  }
}
