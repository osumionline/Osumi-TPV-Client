import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import {
  parseTiendaOnlineMetodosPago,
  type TiendaOnlineSyncConfig,
} from '@desktop-contracts/configuration/tienda-online-sync-config';
import type {
  IvaOptionFormModel,
  MarginOptionFormModel,
} from '@model/configuracion/installation-form.model';
import type { SettingsFormModel } from '@model/configuracion/settings-form.model';

export default function createSettingsCommand(
  model: SettingsFormModel,
): ConfigurationUpdateCommand {
  const selectedIvaOptions: readonly IvaOptionFormModel[] = model.fiscalidad.ivaOptions.filter(
    (option: IvaOptionFormModel): boolean => option.selected,
  );

  let sync: TiendaOnlineSyncConfig | null = null;

  if (model.ventaOnline.active && model.ventaOnline.syncConfigured) {
    const methods = parseTiendaOnlineMetodosPago(model.ventaOnline.metodosPago);

    const politicaAck = model.ventaOnline.politicaAck;

    if (
      methods === null ||
      politicaAck === '' ||
      model.ventaOnline.fuenteId.trim() === '' ||
      model.ventaOnline.zonaHoraria.trim() === ''
    ) {
      throw new Error('La configuración de sincronización de tienda online está incompleta.');
    }

    sync = {
      fuenteId: model.ventaOnline.fuenteId,
      zonaHoraria: model.ventaOnline.zonaHoraria,
      metodosPago: methods,
      politicaAck,
    };
  }

  return {
    negocio: {
      nombre: model.negocio.nombre,
      nombreComercial: model.negocio.nombreComercial,
      cif: model.negocio.cif,
      telefono: model.negocio.telefono,
      email: model.negocio.email,
      direccion: model.negocio.direccion,
      poblacion: model.negocio.poblacion,
    },

    redes: {
      twitter: model.redes.twitter,
      facebook: model.redes.facebook,
      instagram: model.redes.instagram,
      web: model.redes.web,
    },

    ticket: {
      frases: model.ticket.frases
        .split(/\r?\n/)
        .map((phrase: string): string => phrase.trim())
        .filter((phrase: string): boolean => phrase !== ''),
    },

    ticketEmail: {
      subjectTemplate: model.ticketEmail.subjectTemplate,
      bodyTemplate: model.ticketEmail.bodyTemplate,
    },

    fiscalidad: {
      tipoIva: model.fiscalidad.tipoIva,

      ivaList: selectedIvaOptions.map((option: IvaOptionFormModel): number => option.iva),

      reList:
        model.fiscalidad.tipoIva === 're'
          ? selectedIvaOptions.map((option: IvaOptionFormModel): number => option.re)
          : [],

      marginList: model.fiscalidad.marginOptions
        .filter((option: MarginOptionFormModel): boolean => option.selected)
        .map((option: MarginOptionFormModel): number => option.value),
    },

    opciones: {
      backupAutomaticTime: model.backup.automaticTime,
      fechaCaducidad: model.opciones.fechaCaducidad,
    },

    integrations: {
      backupApiKey: toOptionalSecret(model.backup.backupApiKey),

      ventaOnline: {
        active: model.ventaOnline.active,
        urlApi: model.ventaOnline.urlApi,
        secretApi: toOptionalSecret(model.ventaOnline.secretApi),
        sync,
      },

      emailSmtp: {
        active: model.emailSmtp.active,
        host: model.emailSmtp.host,
        port: model.emailSmtp.port,
        secure: model.emailSmtp.secure,
        user: model.emailSmtp.user,
        password: toOptionalSecret(model.emailSmtp.password),
      },

      ticketBai: {
        active: model.ticketBai.active,
        nif: model.ticketBai.nif,
        environment: model.ticketBai.environment,
        token: toOptionalSecret(model.ticketBai.token),
      },
    },
  };
}

function toOptionalSecret(value: string): string | null {
  /*
   * No hacemos trim deliberadamente:
   * una credencial debe conservarse exactamente
   * como la ha introducido el usuario.
   */
  return value === '' ? null : value;
}
