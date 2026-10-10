import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  InstallationLogoData,
  InstallationSecretsData,
} from '@desktop-contracts/configuration/installation-command.interface';
import FileInstallationStaging from '@infrastructure/filesystem/file-installation-staging';
import { describe, expect, it } from 'vitest';

describe('FileInstallationStaging', (): void => {
  it('registra un fallo secundario de limpieza sin ocultar el error principal', async (): Promise<void> => {
    const prepareError: Error = new Error('No se ha podido guardar el logo temporal.');
    const cleanupError: Error = new Error('No se ha podido limpiar el staging.');

    const applicationLogger = new TestApplicationLogger();

    const staging = new CleanupFailingFileInstallationStaging(
      new NoopAppDataRepository(),
      new FailingLogoStorage(prepareError),
      new NoopSecretStorage(),
      applicationLogger,
      cleanupError,
    );

    await expect(staging.prepare(createAppData(), createLogo(), createSecrets())).rejects.toBe(
      prepareError,
    );

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'installation',
        operation: 'cleanup-installation-staging-after-error',
        message:
          'No se ha podido limpiar completamente el staging después de fallar su preparación.',
        error: cleanupError,
      },
    ]);
  });
});

/**
 * Staging que permite simular un fallo exclusivamente
 * durante el reset de recuperación.
 */
class CleanupFailingFileInstallationStaging extends FileInstallationStaging {
  private resetCalls: number = 0;

  /**
   * Crea el staging controlado utilizado por la prueba.
   */
  constructor(
    appDataRepository: AppDataRepository,
    logoStorage: LogoStorage,
    secretStorage: SecretStorage,
    applicationLogger: ApplicationLogger,
    private readonly cleanupError: Error,
  ) {
    super(
      'staging',
      'staging/files',
      appDataRepository,
      logoStorage,
      secretStorage,
      applicationLogger,
    );
  }

  /**
   * Permite el reset inicial y falla exclusivamente
   * durante la limpieza posterior al error.
   */
  override reset(): Promise<void> {
    this.resetCalls++;

    if (this.resetCalls > 1) {
      return Promise.reject(this.cleanupError);
    }

    return Promise.resolve();
  }
}

/**
 * Repositorio neutro de AppData.
 */
class NoopAppDataRepository implements AppDataRepository {
  /**
   * Indica que no existe configuración.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Devuelve ausencia de configuración.
   */
  load(): Promise<AppData | null> {
    return Promise.resolve(null);
  }

  /**
   * Acepta AppData sin persistirlo.
   */
  save(appData: AppData): Promise<void> {
    void appData;

    return Promise.resolve();
  }

  /**
   * Simula la eliminación de AppData.
   */
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Logo storage que provoca el error principal
 * de preparación utilizado por la prueba.
 */
class FailingLogoStorage implements LogoStorage {
  /**
   * Crea el almacenamiento con el error esperado.
   */
  constructor(private readonly error: Error) {}

  /**
   * Indica que no existe logo previo.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Simula el fallo principal.
   */
  save(logo: InstallationLogoData): Promise<void> {
    void logo;

    return Promise.reject(this.error);
  }

  /**
   * Simula la eliminación del logo.
   */
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Almacenamiento neutro de secretos.
 */
class NoopSecretStorage implements SecretStorage {
  /**
   * Indica que no existen secretos.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Devuelve ausencia de secretos.
   */
  load(): Promise<InstallationSecretsData | null> {
    return Promise.resolve(null);
  }

  /**
   * Acepta secretos sin persistirlos.
   */
  save(secrets: InstallationSecretsData): Promise<void> {
    void secrets;

    return Promise.resolve();
  }

  /**
   * Simula la eliminación de secretos.
   */
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Logger controlado utilizado por las pruebas.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora eventos de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora eventos informativos.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva avisos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores.
   */
  error(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * No mantiene escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Construye el AppData mínimo utilizado por la prueba.
 */
function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-10-10T10:00:00.000Z',
    nombre: 'Empresa',
    nombreComercial: 'Comercio',
    cif: 'B12345678',
    telefono: '',
    direccion: '',
    poblacion: '',
    email: 'test@example.com',
    twitter: '',
    facebook: '',
    instagram: '',
    web: '',
    frasesTicket: [],
    ticketEmail: {
      subjectTemplate: '{nombreNegocio} - Ticket {referencia}',
      bodyTemplate: 'Ticket {referencia}',
    },
    tipoIva: 'iva',
    ivaList: [21],
    reList: [],
    marginList: [],
    ventaOnline: false,
    urlApi: '',
    emailSmtp: null,
    ticketBai: null,
    backupAutomaticTime: '03:00',
    fechaCad: false,
  };
}

/**
 * Construye el logo mínimo utilizado por la prueba.
 */
function createLogo(): InstallationLogoData {
  return {
    fileName: 'logo.png',
    mimeType: 'image/png',
    dataUrl: 'data:image/png;base64,AA==',
  };
}

/**
 * Construye los secretos mínimos utilizados por la prueba.
 */
function createSecrets(): InstallationSecretsData {
  return {
    secretApi: '',
    backupApiKey: '',
    emailSmtpPass: null,
    ticketBaiToken: null,
  };
}
