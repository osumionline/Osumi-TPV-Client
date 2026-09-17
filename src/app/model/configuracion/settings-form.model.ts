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

export interface SettingsOptionsFormModel {
  fechaCaducidad: boolean;
  empleados: boolean;
}

export interface SettingsFormModel {
  negocio: SettingsBusinessFormModel;
  redes: SettingsSocialFormModel;
  ticket: SettingsTicketFormModel;
  ticketEmail: SettingsTicketEmailFormModel;
  fiscalidad: SettingsTaxFormModel;
  opciones: SettingsOptionsFormModel;
}
