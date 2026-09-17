import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
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
      fechaCaducidad: model.opciones.fechaCaducidad,
      empleados: model.opciones.empleados,
    },
  };
}
