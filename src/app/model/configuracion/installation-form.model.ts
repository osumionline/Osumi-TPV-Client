import type EmailSmtpSecurity from '@desktop-contracts/configuration/email-smtp-security.type';
import type TipoIva from '@desktop-contracts/tipo-iva.type';

export interface InstallationBusinessFormModel {
  nombre: string;
  nombreComercial: string;
  cif: string;
  telefono: string;
  email: string;
  direccion: string;
  poblacion: string;
  logoDataUrl: string;
}

export interface InstallationEmployeeFormModel {
  nombre: string;
  password: string;
  confirmPassword: string;
  color: string;
}

export interface InstallationSocialFormModel {
  twitter: string;
  facebook: string;
  instagram: string;
  web: string;
}

export interface InstallationTicketFormModel {
  frases: string;
}

export interface InstallationInitialValuesFormModel {
  cajaInicial: number;
  ticketInicial: number;
  facturaInicial: number;
}

export interface IvaOptionFormModel {
  iva: number;
  re: number;
  selected: boolean;
}

export interface MarginOptionFormModel {
  value: number;
  selected: boolean;
}

export interface InstallationTaxFormModel {
  tipoIva: TipoIva;
  ivaOptions: IvaOptionFormModel[];
  marginOptions: MarginOptionFormModel[];
}

export interface InstallationOnlineStoreFormModel {
  active: boolean;
  urlApi: string;
  secretApi: string;
}

export interface InstallationEmailSmtpFormModel {
  active: boolean;
  host: string;
  port: number;
  secure: EmailSmtpSecurity;
  user: string;
  pass: string;
}

export interface InstallationTicketBaiFormModel {
  active: boolean;
  nif: string;
  token: string;
}

export interface InstallationOptionsFormModel {
  backupApiKey: string;
  fechaCaducidad: boolean;
  empleados: boolean;
}

export interface InstallationFormModel {
  negocio: InstallationBusinessFormModel;
  empleado: InstallationEmployeeFormModel;
  redes: InstallationSocialFormModel;
  ticket: InstallationTicketFormModel;
  valoresIniciales: InstallationInitialValuesFormModel;
  fiscalidad: InstallationTaxFormModel;
  ventaOnline: InstallationOnlineStoreFormModel;
  emailSmtp: InstallationEmailSmtpFormModel;
  ticketBai: InstallationTicketBaiFormModel;
  opciones: InstallationOptionsFormModel;
}
