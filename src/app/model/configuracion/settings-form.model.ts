import type EmailSmtpSecurity from '@desktop-contracts/configuration/email-smtp-security.type';
import type { TicketBaiEnvironment } from '@desktop-contracts/configuration/ticket-bai-environment.type';
import type TipoIva from '@desktop-contracts/tipo-iva.type';
import type {
  IvaOptionFormModel,
  MarginOptionFormModel,
} from '@model/configuracion/installation-form.model';

export interface SettingsBusinessFormModel {
  nombre: string;
  nombreComercial: string;
  cif: string;
  telefono: string;
  email: string;
  direccion: string;
  poblacion: string;
}

export interface SettingsSocialFormModel {
  twitter: string;
  facebook: string;
  instagram: string;
  web: string;
}

export interface SettingsTicketFormModel {
  frases: string;
}

export interface SettingsTicketEmailFormModel {
  subjectTemplate: string;
  bodyTemplate: string;
}

export interface SettingsTaxFormModel {
  tipoIva: TipoIva;
  ivaOptions: IvaOptionFormModel[];
  marginOptions: MarginOptionFormModel[];
}

export interface SettingsOnlineStoreFormModel {
  active: boolean;
  urlApi: string;
  secretApi: string;
}

export interface SettingsEmailSmtpFormModel {
  active: boolean;
  host: string;
  port: number;
  secure: EmailSmtpSecurity;
  user: string;
  password: string;
}

export interface SettingsTicketBaiFormModel {
  active: boolean;
  nif: string;
  environment: TicketBaiEnvironment;
  token: string;
}

export interface SettingsBackupFormModel {
  backupApiKey: string;
}

export interface SettingsOptionsFormModel {
  fechaCaducidad: boolean;
}

export interface SettingsFormModel {
  negocio: SettingsBusinessFormModel;
  redes: SettingsSocialFormModel;
  ticket: SettingsTicketFormModel;
  ticketEmail: SettingsTicketEmailFormModel;
  fiscalidad: SettingsTaxFormModel;

  ventaOnline: SettingsOnlineStoreFormModel;
  emailSmtp: SettingsEmailSmtpFormModel;
  ticketBai: SettingsTicketBaiFormModel;
  backup: SettingsBackupFormModel;

  opciones: SettingsOptionsFormModel;
}
