import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type EmailSmtpSecurity from '@desktop-contracts/configuration/email-smtp-security.type';
import { DEFAULT_TICKET_BAI_ENVIRONMENT } from '@desktop-contracts/configuration/ticket-bai-environment.type';
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

    ventaOnline: {
      active: appData.ventaOnline,
      urlApi: appData.urlApi,
      secretApi: '',
    },

    emailSmtp: {
      active: appData.emailSmtp !== null,
      host: appData.emailSmtp?.host ?? '',
      port: appData.emailSmtp?.port ?? 587,
      secure: resolveEmailSmtpSecurity(appData),
      user: appData.emailSmtp?.user ?? '',
      password: '',
    },

    ticketBai: {
      active: appData.ticketBai !== null,
      nif: appData.ticketBai?.nif ?? '',
      environment: appData.ticketBai?.environment ?? DEFAULT_TICKET_BAI_ENVIRONMENT,
      token: '',
    },

    backup: {
      backupApiKey: '',
    },

    opciones: {
      fechaCaducidad: appData.fechaCad,
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
    ): IvaOptionFormModel => {
      const currentIndex: number = appData.ivaList.indexOf(option.iva);

      const currentRe: number | undefined =
        currentIndex === -1 ? undefined : appData.reList[currentIndex];

      return {
        iva: option.iva,

        /*
         * Si este IVA ya existe en AppData conservamos
         * su RE actual. Solo usamos el estándar como
         * valor por defecto.
         */
        re: currentRe ?? option.re,

        selected: appData.ivaList.includes(option.iva),
      };
    },
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

function resolveEmailSmtpSecurity(appData: AppData): EmailSmtpSecurity {
  const security: string | null | undefined = appData.emailSmtp?.secure;

  if (security === 'none' || security === 'tls' || security === 'ssl') {
    return security;
  }

  return 'tls';
}
