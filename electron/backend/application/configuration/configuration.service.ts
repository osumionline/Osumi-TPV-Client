import {
  isConfigurationUpdateCommand,
  validateConfigurationUpdateCommand,
} from '@backend/application/configuration/configuration-update-command.validator';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import type {
  ConfigurationEmailSmtpUpdateData,
  ConfigurationIntegrationsUpdateData,
  ConfigurationOnlineStoreUpdateData,
  ConfigurationTicketBaiUpdateData,
} from '@desktop-contracts/configuration/configuration-update-command.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';

export default class ConfigurationService {
  constructor(
    private readonly appDataRepository: AppDataRepository,
    private readonly secretStorage: SecretStorage,
    private readonly logoStorage: LogoStorage,
  ) {}

  /**
   * Indica si existe una configuración válida instalada.
   */
  async isConfigured(): Promise<boolean> {
    const appData: AppData | null = await this.appDataRepository.load();

    return appData !== null;
  }

  /**
   * Obtiene la configuración pública de la instalación.
   */
  load(): Promise<AppData | null> {
    return this.appDataRepository.load();
  }

  /**
   * Actualiza los ajustes de la aplicación.
   *
   * Los secretos nunca se devuelven al renderer:
   * un valor null conserva el secreto existente cuando
   * la integración ya estaba activa.
   */
  async update(command: unknown): Promise<AppData> {
    if (!isConfigurationUpdateCommand(command)) {
      throw new Error('El comando de actualización de configuración no es válido.');
    }

    const validationErrors: readonly string[] = validateConfigurationUpdateCommand(command);

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(' '));
    }

    const currentAppData: AppData | null = await this.appDataRepository.load();

    if (currentAppData === null) {
      throw new Error('La aplicación todavía no está configurada.');
    }

    const currentSecrets: InstallationSecretsData | null =
      command.integrations === undefined ? null : await this.secretStorage.load();

    const updatedSecrets: InstallationSecretsData | null =
      command.integrations === undefined
        ? null
        : this.createUpdatedSecrets(currentAppData, currentSecrets, command.integrations);

    const updatedAppData: AppData = this.applyUpdate(currentAppData, command);

    try {
      if (updatedSecrets !== null) {
        await this.secretStorage.save(updatedSecrets);
      }

      await this.appDataRepository.save(updatedAppData);

      /*
       * El logo se guarda el último.
       * ElectronLogoStorage realiza una sustitución atómica,
       * por lo que un fallo mantiene el logo anterior.
       */
      if (command.logo !== undefined) {
        await this.logoStorage.save(command.logo);
      }

      return updatedAppData;
    } catch (error: unknown) {
      await this.rollbackUpdate(currentAppData, currentSecrets, updatedSecrets !== null);

      throw error;
    }
  }

  private applyUpdate(current: AppData, command: ConfigurationUpdateCommand): AppData {
    const base: AppData = {
      ...current,

      nombre: command.negocio.nombre,
      nombreComercial: command.negocio.nombreComercial,
      cif: command.negocio.cif,
      telefono: command.negocio.telefono,
      email: command.negocio.email,
      direccion: command.negocio.direccion,
      poblacion: command.negocio.poblacion,

      twitter: command.redes.twitter,
      facebook: command.redes.facebook,
      instagram: command.redes.instagram,
      web: command.redes.web,

      frasesTicket: command.ticket.frases
        .map((phrase: string): string => phrase.trim())
        .filter((phrase: string): boolean => phrase !== ''),

      ticketEmail: {
        subjectTemplate: command.ticketEmail.subjectTemplate,
        bodyTemplate: command.ticketEmail.bodyTemplate,
      },

      tipoIva: command.fiscalidad.tipoIva,
      ivaList: [...command.fiscalidad.ivaList],
      reList: [...command.fiscalidad.reList],
      marginList: [...command.fiscalidad.marginList],

      fechaCad: command.opciones.fechaCaducidad,
      empleados: command.opciones.empleados,
    };

    if (command.integrations === undefined) {
      return base;
    }

    return this.applyIntegrations(base, command.integrations);
  }

  private applyIntegrations(
    appData: AppData,
    integrations: ConfigurationIntegrationsUpdateData,
  ): AppData {
    const { ventaOnline, emailSmtp, ticketBai } = integrations;

    return {
      ...appData,

      ventaOnline: ventaOnline.active,
      urlApi: ventaOnline.active ? ventaOnline.urlApi : '',

      emailSmtp: emailSmtp.active
        ? {
            host: emailSmtp.host,
            port: emailSmtp.port,
            secure: emailSmtp.secure,
            user: emailSmtp.user,
          }
        : null,

      ticketBai: ticketBai.active
        ? {
            nif: ticketBai.nif,
            environment: ticketBai.environment,
          }
        : null,
    };
  }

  private createUpdatedSecrets(
    currentAppData: AppData,
    currentSecrets: InstallationSecretsData | null,
    integrations: ConfigurationIntegrationsUpdateData,
  ): InstallationSecretsData {
    const existing: InstallationSecretsData = currentSecrets ?? {
      secretApi: '',
      backupApiKey: '',
      emailSmtpPass: null,
      ticketBaiToken: null,
    };

    return {
      secretApi: this.resolveOnlineStoreSecret(currentAppData, existing, integrations.ventaOnline),

      /*
       * Este bloque de Ajustes no modifica la clave
       * utilizada por el futuro módulo de copias.
       */
      backupApiKey: existing.backupApiKey,

      emailSmtpPass: this.resolveEmailSmtpPassword(
        currentAppData,
        existing,
        integrations.emailSmtp,
      ),

      ticketBaiToken: this.resolveTicketBaiToken(currentAppData, existing, integrations.ticketBai),
    };
  }

  private resolveOnlineStoreSecret(
    currentAppData: AppData,
    currentSecrets: InstallationSecretsData,
    update: ConfigurationOnlineStoreUpdateData,
  ): string {
    if (!update.active) {
      return '';
    }

    if (update.secretApi !== null) {
      return update.secretApi;
    }

    if (!currentAppData.ventaOnline) {
      throw new Error('Debes indicar el secreto de la API al activar la tienda online.');
    }

    if (currentSecrets.secretApi === '') {
      throw new Error('La tienda online no tiene un secreto de API válido almacenado.');
    }

    return currentSecrets.secretApi;
  }

  private resolveEmailSmtpPassword(
    currentAppData: AppData,
    currentSecrets: InstallationSecretsData,
    update: ConfigurationEmailSmtpUpdateData,
  ): string | null {
    if (!update.active) {
      return null;
    }

    if (update.password !== null) {
      return update.password;
    }

    if (currentAppData.emailSmtp === null) {
      throw new Error('Debes indicar la contraseña SMTP al activar el envío de emails.');
    }

    if (currentSecrets.emailSmtpPass === null || currentSecrets.emailSmtpPass === '') {
      throw new Error('SMTP no tiene una contraseña válida almacenada.');
    }

    return currentSecrets.emailSmtpPass;
  }

  private resolveTicketBaiToken(
    currentAppData: AppData,
    currentSecrets: InstallationSecretsData,
    update: ConfigurationTicketBaiUpdateData,
  ): string | null {
    if (!update.active) {
      return null;
    }

    if (update.token !== null) {
      return update.token;
    }

    if (currentAppData.ticketBai === null) {
      throw new Error('Debes indicar el token al activar TicketBAI.');
    }

    if (currentSecrets.ticketBaiToken === null || currentSecrets.ticketBaiToken === '') {
      throw new Error('TicketBAI no tiene un token válido almacenado.');
    }

    return currentSecrets.ticketBaiToken;
  }

  private async rollbackUpdate(
    currentAppData: AppData,
    currentSecrets: InstallationSecretsData | null,
    secretsChanged: boolean,
  ): Promise<void> {
    try {
      await this.appDataRepository.save(currentAppData);
    } catch (rollbackError: unknown) {
      console.error('No se ha podido restaurar app_data.json tras un error:', rollbackError);
    }

    if (!secretsChanged) {
      return;
    }

    try {
      if (currentSecrets === null) {
        await this.secretStorage.delete();
      } else {
        await this.secretStorage.save(currentSecrets);
      }
    } catch (rollbackError: unknown) {
      console.error('No se han podido restaurar los secretos tras un error:', rollbackError);
    }
  }
}
