import {
  isConfigurationUpdateCommand,
  validateConfigurationUpdateCommand,
} from '@backend/application/configuration/configuration-update-command.validator';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';

export default class ConfigurationService {
  constructor(private readonly appDataRepository: AppDataRepository) {}

  async isConfigured(): Promise<boolean> {
    const appData: AppData | null = await this.appDataRepository.load();

    return appData !== null;
  }

  load(): Promise<AppData | null> {
    return this.appDataRepository.load();
  }

  /**
   * Actualiza los ajustes generales conservando metadatos,
   * integraciones y cualquier configuración sensible asociada.
   */
  async update(command: unknown): Promise<AppData> {
    if (!isConfigurationUpdateCommand(command)) {
      throw new Error('El comando de actualización de configuración no es válido.');
    }

    const validationErrors: readonly string[] = validateConfigurationUpdateCommand(command);

    if (validationErrors.length > 0) {
      throw new Error(validationErrors.join(' '));
    }

    const current: AppData | null = await this.appDataRepository.load();

    if (current === null) {
      throw new Error('La aplicación todavía no está configurada.');
    }

    const updated: AppData = this.applyUpdate(current, command);

    await this.appDataRepository.save(updated);

    return updated;
  }

  private applyUpdate(current: AppData, command: ConfigurationUpdateCommand): AppData {
    return {
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
  }
}
