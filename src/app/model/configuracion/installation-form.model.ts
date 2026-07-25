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

export interface InstallationOptionsFormModel {
  backupApiKey: string;
  fechaCaducidad: boolean;
  empleados: boolean;
}

export interface InstallationFormModel {
  negocio: InstallationBusinessFormModel;
  empleado: InstallationEmployeeFormModel;
  redes: InstallationSocialFormModel;
  valoresIniciales: InstallationInitialValuesFormModel;
  fiscalidad: InstallationTaxFormModel;
  ventaOnline: InstallationOnlineStoreFormModel;
  opciones: InstallationOptionsFormModel;
}
