import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type {
  IvaOptionFormModel,
  MarginOptionFormModel,
} from '@model/configuracion/installation-form.model';
import type { SettingsFormModel } from '@model/configuracion/settings-form.model';

const DEFAULT_IVA_OPTIONS: readonly Readonly<{
  iva: number;
  re: number;
}>[] = [
  {
    iva: 4,
    re: 0.5,
  },
  {
    iva: 10,
    re: 1.4,
  },
  {
    iva: 21,
    re: 5.2,
  },
];

const DEFAULT_MARGIN_OPTIONS: readonly number[] = [
  10, 15, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70, 75, 80, 85, 90, 95,
];

export default function createSettingsFormInitialValue(appData: AppData): SettingsFormModel {
  return {
    negocio: {
      nombre: appData.nombre,
      nombreComercial: appData.nombreComercial,
      cif: appData.cif,
      telefono: appData.telefono,
      email: appData.email,
      direccion: appData.direccion,
      poblacion: appData.poblacion,
    },

    redes: {
      twitter: appData.twitter,
      facebook: appData.facebook,
      instagram: appData.instagram,
      web: appData.web,
    },

    ticket: {
      frases: appData.frasesTicket.join('\n'),
    },

    ticketEmail: {
      subjectTemplate: appData.ticketEmail.subjectTemplate,
      bodyTemplate: appData.ticketEmail.bodyTemplate,
    },

    fiscalidad: {
      tipoIva: appData.tipoIva,
      ivaOptions: createIvaOptions(appData),
      marginOptions: createMarginOptions(appData),
    },

    opciones: {
      fechaCaducidad: appData.fechaCad,
      empleados: appData.empleados,
    },
  };
}

function createIvaOptions(appData: AppData): IvaOptionFormModel[] {
  const options: IvaOptionFormModel[] = DEFAULT_IVA_OPTIONS.map(
    (
      option: Readonly<{
        iva: number;
        re: number;
      }>,
    ): IvaOptionFormModel => ({
      iva: option.iva,
      re: option.re,
      selected: appData.ivaList.includes(option.iva),
    }),
  );

  for (let index: number = 0; index < appData.ivaList.length; index++) {
    const iva: number = appData.ivaList[index];

    const exists: boolean = options.some(
      (option: IvaOptionFormModel): boolean => option.iva === iva,
    );

    if (exists) {
      continue;
    }

    options.push({
      iva,
      re: appData.reList[index] ?? 0,
      selected: true,
    });
  }

  return options.sort(
    (first: IvaOptionFormModel, second: IvaOptionFormModel): number => first.iva - second.iva,
  );
}

function createMarginOptions(appData: AppData): MarginOptionFormModel[] {
  const values: number[] = [...DEFAULT_MARGIN_OPTIONS];

  for (const margin of appData.marginList) {
    if (!values.includes(margin)) {
      values.push(margin);
    }
  }

  return values
    .sort((first: number, second: number): number => first - second)
    .map((value: number): MarginOptionFormModel => ({
      value,
      selected: appData.marginList.includes(value),
    }));
}
