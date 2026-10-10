import ConfigurationService from '@backend/application/configuration/configuration.service';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import type {
  InstallationLogoData,
  InstallationSecretsData,
} from '@desktop-contracts/configuration/installation-command.interface';
import { beforeEach, describe, expect, it } from 'vitest';

class MemoryAppDataRepository implements AppDataRepository {
  constructor(public value: AppData | null) {}

  async exists(): Promise<boolean> {
    return this.value !== null;
  }

  load(): Promise<AppData | null> {
    return Promise.resolve(this.value);
  }

  save(appData: AppData): Promise<void> {
    this.value = structuredClone(appData);

    return Promise.resolve();
  }

  delete(): Promise<void> {
    this.value = null;

    return Promise.resolve();
  }
}

class MemorySecretStorage implements SecretStorage {
  constructor(public value: InstallationSecretsData | null) {}

  async exists(): Promise<boolean> {
    return this.value !== null;
  }

  load(): Promise<InstallationSecretsData | null> {
    return Promise.resolve(this.value === null ? null : structuredClone(this.value));
  }

  save(secrets: InstallationSecretsData): Promise<void> {
    this.value = structuredClone(secrets);

    return Promise.resolve();
  }

  delete(): Promise<void> {
    this.value = null;

    return Promise.resolve();
  }
}

class MemoryLogoStorage implements LogoStorage {
  savedLogo: InstallationLogoData | null = null;
  failOnSave: boolean = false;

  exists(): Promise<boolean> {
    return Promise.resolve(this.savedLogo !== null);
  }

  save(logo: InstallationLogoData): Promise<void> {
    if (this.failOnSave) {
      return Promise.reject(new Error('Error guardando logo'));
    }

    this.savedLogo = structuredClone(logo);

    return Promise.resolve();
  }

  delete(): Promise<void> {
    this.savedLogo = null;

    return Promise.resolve();
  }
}

let appDataRepository: MemoryAppDataRepository;
let secretStorage: MemorySecretStorage;
let logoStorage: MemoryLogoStorage;
let service: ConfigurationService;
let applicationLogger: TestApplicationLogger;

describe('ConfigurationService', (): void => {
  beforeEach((): void => {
    appDataRepository = new MemoryAppDataRepository(createAppData());

    secretStorage = new MemorySecretStorage({
      secretApi: 'old-api-secret',
      backupApiKey: 'backup-secret',
      emailSmtpPass: 'old-smtp-password',
      ticketBaiToken: 'old-ticketbai-token',
    });

    logoStorage = new MemoryLogoStorage();

    applicationLogger = new TestApplicationLogger();

    service = new ConfigurationService(
      appDataRepository,
      secretStorage,
      logoStorage,
      applicationLogger,
    );
  });

  it('conserva los secretos existentes cuando llegan como null', async (): Promise<void> => {
    const command: ConfigurationUpdateCommand = createCommand();

    await service.update(command);

    expect(secretStorage.value).toEqual({
      secretApi: 'old-api-secret',
      backupApiKey: 'backup-secret',
      emailSmtpPass: 'old-smtp-password',
      ticketBaiToken: 'old-ticketbai-token',
    });

    expect(appDataRepository.value?.ventaOnline).toBe(true);

    expect(appDataRepository.value?.emailSmtp).not.toBeNull();

    expect(appDataRepository.value?.ticketBai).not.toBeNull();
  });

  it('elimina los secretos de las integraciones desactivadas', async (): Promise<void> => {
    const command: ConfigurationUpdateCommand = {
      ...createCommand(),

      integrations: {
        ventaOnline: {
          active: false,
          urlApi: '',
          secretApi: null,
        },

        emailSmtp: {
          active: false,
          host: '',
          port: 587,
          secure: 'tls',
          user: '',
          password: null,
        },

        ticketBai: {
          active: false,
          nif: '',
          environment: 'production',
          token: null,
        },

        backupApiKey: null,
      },
    };

    await service.update(command);

    expect(secretStorage.value).toEqual({
      secretApi: '',
      backupApiKey: 'backup-secret',
      emailSmtpPass: null,
      ticketBaiToken: null,
    });

    expect(appDataRepository.value?.ventaOnline).toBe(false);

    expect(appDataRepository.value?.emailSmtp).toBeNull();

    expect(appDataRepository.value?.ticketBai).toBeNull();
  });

  it('exige un secreto nuevo al activar una integración', async (): Promise<void> => {
    appDataRepository.value = {
      ...createAppData(),
      ventaOnline: false,
      urlApi: '',
    };

    const command: ConfigurationUpdateCommand = createCommand();

    await expect(service.update(command)).rejects.toThrow(
      'Debes indicar el secreto de la API al activar la tienda online.',
    );
    expect(applicationLogger.errorEvents).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('restaura configuración y secretos si falla el logo', async (): Promise<void> => {
    const originalAppData: AppData = structuredClone(appDataRepository.value as AppData);

    const originalSecrets: InstallationSecretsData = structuredClone(
      secretStorage.value as InstallationSecretsData,
    );

    logoStorage.failOnSave = true;

    const command: ConfigurationUpdateCommand = {
      ...createCommand(),

      negocio: {
        ...createCommand().negocio,
        nombre: 'Nombre modificado',
      },

      integrations: {
        ventaOnline: {
          active: true,
          urlApi: 'https://new.example.com',
          secretApi: 'new-api-secret',
        },

        emailSmtp: {
          active: true,
          host: 'smtp.new.example.com',
          port: 465,
          secure: 'ssl',
          user: 'nuevo@example.com',
          password: 'new-smtp-password',
        },

        ticketBai: {
          active: true,
          nif: 'B99999999',
          environment: 'test',
          token: 'new-ticketbai-token',
        },

        backupApiKey: null,
      },

      logo: {
        fileName: 'logo.png',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AAAA',
      },
    };

    await expect(service.update(command)).rejects.toThrow('Error guardando logo');

    expect(appDataRepository.value).toEqual(originalAppData);
    expect(secretStorage.value).toEqual(originalSecrets);
    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'configuration',
        operation: 'update-configuration',
        message: 'No se ha podido actualizar la configuración de la aplicación.',
        error: expect.objectContaining({
          message: 'Error guardando logo',
        }),
      },
    ]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra los fallos secundarios de rollback sin ocultar el error original', async (): Promise<void> => {
    const rollbackAppDataError: Error = new Error(
      'No se ha podido restaurar la configuración pública.',
    );
    const rollbackSecretsError: Error = new Error('No se han podido restaurar los secretos.');

    const failingAppDataRepository = new RollbackFailingAppDataRepository(
      createAppData(),
      rollbackAppDataError,
    );

    const failingSecretStorage = new RollbackFailingSecretStorage(
      {
        secretApi: 'old-api-secret',
        backupApiKey: 'backup-secret',
        emailSmtpPass: 'old-smtp-password',
        ticketBaiToken: 'old-ticketbai-token',
      },
      rollbackSecretsError,
    );

    const failingLogoStorage = new MemoryLogoStorage();
    failingLogoStorage.failOnSave = true;

    const logger = new TestApplicationLogger();

    const failingService = new ConfigurationService(
      failingAppDataRepository,
      failingSecretStorage,
      failingLogoStorage,
      logger,
    );

    const command: ConfigurationUpdateCommand = {
      ...createCommand(),
      logo: {
        fileName: 'logo.png',
        mimeType: 'image/png',
        dataUrl: 'data:image/png;base64,AAAA',
      },
    };

    await expect(failingService.update(command)).rejects.toThrow('Error guardando logo');

    expect(logger.errorEvents).toEqual([
      {
        area: 'configuration',
        operation: 'update-configuration',
        message: 'No se ha podido actualizar la configuración de la aplicación.',
        error: expect.objectContaining({
          message: 'Error guardando logo',
        }),
      },
    ]);

    expect(logger.warnEvents).toEqual([
      {
        area: 'configuration',
        operation: 'rollback-app-data',
        message:
          'No se ha podido restaurar la configuración pública después de fallar una actualización.',
        error: rollbackAppDataError,
      },
      {
        area: 'configuration',
        operation: 'rollback-secrets',
        message: 'No se han podido restaurar los secretos después de fallar una actualización.',
        error: rollbackSecretsError,
      },
    ]);
  });

  it('revela los secretos operacionales autorizados', async (): Promise<void> => {
    await expect(service.revealSecret('secretApi')).resolves.toBe('old-api-secret');

    await expect(service.revealSecret('backupApiKey')).resolves.toBe('backup-secret');

    await expect(service.revealSecret('ticketBaiToken')).resolves.toBe('old-ticketbai-token');
  });

  it('devuelve null cuando el secreto revelable no está configurado', async (): Promise<void> => {
    secretStorage.value = {
      secretApi: '',
      backupApiKey: '',
      emailSmtpPass: 'smtp-password',
      ticketBaiToken: null,
    };

    await expect(service.revealSecret('secretApi')).resolves.toBeNull();

    await expect(service.revealSecret('backupApiKey')).resolves.toBeNull();

    await expect(service.revealSecret('ticketBaiToken')).resolves.toBeNull();

    secretStorage.value = null;

    await expect(service.revealSecret('secretApi')).resolves.toBeNull();
  });

  it('impide revelar la contraseña SMTP o cualquier secreto no autorizado', async (): Promise<void> => {
    await expect(service.revealSecret('emailSmtpPass')).rejects.toThrow(
      'El secreto solicitado no puede revelarse.',
    );

    await expect(service.revealSecret('otroSecreto')).rejects.toThrow(
      'El secreto solicitado no puede revelarse.',
    );
  });

  it('actualiza backupApiKey sin modificar los demás secretos', async (): Promise<void> => {
    const baseCommand: ConfigurationUpdateCommand = createCommand();

    const integrations = baseCommand.integrations;

    if (integrations === undefined) {
      throw new Error('El comando del test debe incluir integraciones.');
    }

    const command: ConfigurationUpdateCommand = {
      ...baseCommand,

      integrations: {
        ...integrations,
        backupApiKey: 'new-backup-secret',
      },
    };

    await service.update(command);

    expect(secretStorage.value).toEqual({
      secretApi: 'old-api-secret',
      backupApiKey: 'new-backup-secret',
      emailSmtpPass: 'old-smtp-password',
      ticketBaiToken: 'old-ticketbai-token',
    });
  });

  it('actualiza la hora de backup automático', async (): Promise<void> => {
    const baseCommand: ConfigurationUpdateCommand = createCommand();

    const command: ConfigurationUpdateCommand = {
      ...baseCommand,

      opciones: {
        ...baseCommand.opciones,
        backupAutomaticTime: '04:30',
      },
    };

    await service.update(command);

    expect(appDataRepository.value?.backupAutomaticTime).toBe('04:30');
  });
});

function createAppData(): AppData {
  return {
    schemaVersion: 1,
    installedAt: '2026-09-01T10:00:00.000Z',

    nombre: 'Osumi',
    nombreComercial: 'Osumi',
    cif: 'B12345678',
    telefono: '944000000',
    direccion: 'Bilbao',
    poblacion: 'Bilbao',
    email: 'info@example.com',

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
    ivaList: [4, 10, 21],
    reList: [],
    marginList: [20, 30],

    ventaOnline: true,
    urlApi: 'https://old.example.com',

    emailSmtp: {
      host: 'smtp.old.example.com',
      port: 587,
      secure: 'tls',
      user: 'old@example.com',
    },

    ticketBai: {
      nif: 'B12345678',
      environment: 'production',
    },

    backupAutomaticTime: '03:00',
    fechaCad: true,
  };
}

function createCommand(): ConfigurationUpdateCommand {
  return {
    negocio: {
      nombre: 'Osumi',
      nombreComercial: 'Osumi',
      cif: 'B12345678',
      telefono: '944000000',
      email: 'info@example.com',
      direccion: 'Bilbao',
      poblacion: 'Bilbao',
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

    ticketEmail: {
      subjectTemplate: '{nombreNegocio} - Ticket {referencia}',
      bodyTemplate: 'Ticket {referencia}',
    },

    fiscalidad: {
      tipoIva: 'iva',
      ivaList: [4, 10, 21],
      reList: [],
      marginList: [20, 30],
    },

    opciones: {
      backupAutomaticTime: '03:00',
      fechaCaducidad: true,
    },

    integrations: {
      ventaOnline: {
        active: true,
        urlApi: 'https://old.example.com',
        secretApi: null,
      },

      emailSmtp: {
        active: true,
        host: 'smtp.old.example.com',
        port: 587,
        secure: 'tls',
        user: 'old@example.com',
        password: null,
      },

      ticketBai: {
        active: true,
        nif: 'B12345678',
        environment: 'production',
        token: null,
      },

      backupApiKey: null,
    },
  };
}

/**
 * Repositorio que permite simular exclusivamente
 * un fallo al restaurar AppData durante el rollback.
 */
class RollbackFailingAppDataRepository extends MemoryAppDataRepository {
  private saveCalls: number = 0;

  /**
   * Crea el repositorio con el error de rollback
   * que debe simular la prueba.
   */
  constructor(
    value: AppData,
    private readonly rollbackError: Error,
  ) {
    super(value);
  }

  /**
   * Permite la escritura principal y falla
   * únicamente al intentar restaurar AppData.
   */
  override save(appData: AppData): Promise<void> {
    this.saveCalls++;

    if (this.saveCalls > 1) {
      return Promise.reject(this.rollbackError);
    }

    return super.save(appData);
  }
}

/**
 * Almacenamiento que permite simular exclusivamente
 * un fallo al restaurar secretos durante el rollback.
 */
class RollbackFailingSecretStorage extends MemorySecretStorage {
  private saveCalls: number = 0;

  /**
   * Crea el almacenamiento con el error de rollback
   * que debe simular la prueba.
   */
  constructor(
    value: InstallationSecretsData,
    private readonly rollbackError: Error,
  ) {
    super(value);
  }

  /**
   * Permite la escritura principal y falla
   * únicamente al intentar restaurar los secretos.
   */
  override save(secrets: InstallationSecretsData): Promise<void> {
    this.saveCalls++;

    if (this.saveCalls > 1) {
      return Promise.reject(this.rollbackError);
    }

    return super.save(secrets);
  }
}

/**
 * Logger controlado utilizado por las pruebas
 * de actualización de configuración.
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
