import ConfigurationService from '@backend/application/configuration/configuration.service';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
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

    service = new ConfigurationService(appDataRepository, secretStorage, logoStorage);
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

    fechaCad: true,
    empleados: true,
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
      fechaCaducidad: true,
      empleados: true,
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
    },
  };
}
