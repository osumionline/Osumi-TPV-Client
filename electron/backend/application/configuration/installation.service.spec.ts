import ConfigurationService from '@backend/application/configuration/configuration.service';
import InstallationService from '@backend/application/configuration/installation.service';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type InstallationDatabase from '@backend/contracts/configuration/installation-database.interface';
import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type InstallationStaging from '@backend/contracts/configuration/installation-staging.interface';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  InstallationCommand,
  InstallationLogoData,
  InstallationSecretsData,
} from '@desktop-contracts/configuration/installation-command.interface';
import {
  DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
  DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
} from '@desktop-contracts/configuration/ticket-email-config.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let staging: TestInstallationStaging;
let installationDatabase: TestInstallationDatabase;
let installationFinalizer: TestInstallationFinalizer;
let applicationLogger: TestApplicationLogger;
let service: InstallationService;

describe('InstallationService', (): void => {
  beforeEach((): void => {
    applicationLogger = new TestApplicationLogger();
    staging = new TestInstallationStaging();
    installationDatabase = new TestInstallationDatabase();
    installationFinalizer = new TestInstallationFinalizer();

    const configurationService = new ConfigurationService(
      new EmptyAppDataRepository(),
      new EmptySecretStorage(),
      new NoopLogoStorage(),
      applicationLogger,
    );

    service = new InstallationService(
      configurationService,
      staging,
      installationDatabase,
      installationFinalizer,
      applicationLogger,
    );
  });

  it('no registra como incidencia un comando de instalación inválido', async (): Promise<void> => {
    await expect(service.install({})).resolves.toMatchObject({
      status: 'error',
    });

    expect(applicationLogger.errorEvents).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra un fallo técnico y recupera la instalación incompleta', async (): Promise<void> => {
    const error: Error = new Error('No se ha podido preparar staging.');

    staging.prepareError = error;

    await expect(service.install(createValidCommand())).resolves.toEqual({
      status: 'error',
      message: 'No se ha podido completar la instalación.',
      validationErrors: [],
    });

    expect(installationFinalizer.recoverCalls).toBe(1);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'installation',
        operation: 'install',
        message: 'No se ha podido completar la instalación de la aplicación.',
        error,
      },
    ]);

    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra también un fallo secundario de recuperación sin ocultar el original', async (): Promise<void> => {
    const installError: Error = new Error('No se ha podido preparar staging.');
    const recoveryError: Error = new Error('No se ha podido recuperar la instalación.');

    staging.prepareError = installError;
    installationFinalizer.recoverError = recoveryError;

    await expect(service.install(createValidCommand())).resolves.toEqual({
      status: 'error',
      message: 'No se ha podido completar la instalación.',
      validationErrors: [],
    });

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'installation',
        operation: 'install',
        message: 'No se ha podido completar la instalación de la aplicación.',
        error: installError,
      },
    ]);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'installation',
        operation: 'recover-incomplete-installation',
        message: 'No se ha podido recuperar completamente una instalación fallida.',
        error: recoveryError,
      },
    ]);
  });
});

/**
 * Repositorio vacío utilizado para simular
 * una aplicación todavía sin configurar.
 */
class EmptyAppDataRepository implements AppDataRepository {
  /**
   * Indica que AppData todavía no existe.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Devuelve una instalación todavía sin configurar.
   */
  load(): Promise<AppData | null> {
    return Promise.resolve(null);
  }

  /**
   * Acepta una escritura que estas pruebas no necesitan conservar.
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
 * Almacenamiento vacío de secretos para la configuración
 * utilizada indirectamente durante las pruebas.
 */
class EmptySecretStorage implements SecretStorage {
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
   * Acepta una escritura no utilizada en estas pruebas.
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
 * Almacenamiento neutro de logo.
 */
class NoopLogoStorage implements LogoStorage {
  /**
   * Indica que no existe logo.
   */
  exists(): Promise<boolean> {
    return Promise.resolve(false);
  }

  /**
   * Acepta el logo sin persistirlo.
   */
  save(logo: InstallationLogoData): Promise<void> {
    void logo;

    return Promise.resolve();
  }

  /**
   * Simula la eliminación del logo.
   */
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Staging controlado para simular fallos de preparación.
 */
class TestInstallationStaging implements InstallationStaging {
  prepareError: Error | null = null;

  /**
   * Simula un reset correcto.
   */
  reset(): Promise<void> {
    return Promise.resolve();
  }

  /**
   * Simula la preparación temporal de la instalación.
   */
  prepare(
    appData: AppData,
    logo: InstallationLogoData,
    secrets: InstallationSecretsData,
  ): Promise<void> {
    void appData;
    void logo;
    void secrets;

    if (this.prepareError !== null) {
      return Promise.reject(this.prepareError);
    }

    return Promise.resolve();
  }
}

/**
 * Base de datos controlada para la instalación.
 */
class TestInstallationDatabase implements InstallationDatabase {
  /**
   * Simula la preparación correcta de la base de datos.
   */
  prepare(command: InstallationCommand): Promise<void> {
    void command;

    return Promise.resolve();
  }

  /**
   * Simula la eliminación de la base temporal.
   */
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Finalizador controlado para comprobar la recuperación.
 */
class TestInstallationFinalizer implements InstallationFinalizer {
  recoverCalls: number = 0;
  recoverError: Error | null = null;

  /**
   * Simula la recuperación de una instalación fallida.
   */
  recover(): Promise<void> {
    this.recoverCalls++;

    if (this.recoverError !== null) {
      return Promise.reject(this.recoverError);
    }

    return Promise.resolve();
  }

  /**
   * Simula una promoción final correcta.
   */
  finalize(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Logger en memoria utilizado por el servicio.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];
  readonly errorEvents: ApplicationLogEvent[] = [];

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
   * Conserva warnings.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Conserva errores.
   */
  error(event: ApplicationLogEvent): void {
    this.errorEvents.push(event);
  }

  /**
   * No mantiene escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}

/**
 * Construye un comando completo y válido.
 */
function createValidCommand(): InstallationCommand {
  return {
    negocio: {
      nombre: 'Empresa',
      nombreComercial: 'Comercio',
      cif: 'B12345678',
      telefono: '944000000',
      email: 'tienda@example.com',
      direccion: 'Gran Vía 1',
      poblacion: 'Bilbao',
    },
    empleadoInicial: {
      nombre: 'Administrador',
      password: 'password',
      color: '#3f51b5',
    },
    redes: {
      twitter: '',
      facebook: '',
      instagram: '',
      web: '',
    },
    ticket: {
      frases: [],
    },
    valoresIniciales: {
      cajaInicial: 0,
      ticketInicial: 1,
      facturaInicial: 1,
    },
    fiscalidad: {
      tipoIva: 'iva',
      ivaList: [21],
      reList: [],
      marginList: [30],
    },
    ventaOnline: {
      active: false,
      urlApi: '',
    },
    emailSmtp: {
      active: true,
      host: 'smtp.example.com',
      port: 587,
      secure: 'tls',
      user: 'tienda@example.com',
    },
    ticketEmail: {
      subjectTemplate: DEFAULT_TICKET_EMAIL_SUBJECT_TEMPLATE,
      bodyTemplate: DEFAULT_TICKET_EMAIL_BODY_TEMPLATE,
    },
    ticketBai: {
      active: false,
      nif: '',
    },
    opciones: {
      backupAutomaticTime: '03:00',
      fechaCaducidad: false,
    },
    secretos: {
      secretApi: '',
      backupApiKey: '',
      emailSmtpPass: 'smtp-password',
      ticketBaiToken: null,
    },
    logo: {
      fileName: 'logo.png',
      mimeType: 'image/png',
      dataUrl: 'data:image/png;base64,AA==',
    },
  };
}
