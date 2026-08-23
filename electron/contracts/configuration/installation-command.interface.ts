import type TipoIva from '@desktop-contracts/tipo-iva.type';

export interface InstallationBusinessData {
  readonly nombre: string;
  readonly nombreComercial: string;
  readonly cif: string;
  readonly telefono: string;
  readonly email: string;
  readonly direccion: string;
  readonly poblacion: string;
}

export interface InstallationEmployeeData {
  readonly nombre: string;
  readonly password: string;
  readonly color: string;
}

export interface InstallationSocialData {
  readonly twitter: string;
  readonly facebook: string;
  readonly instagram: string;
  readonly web: string;
}

export interface InstallationTicketData {
  readonly frases: readonly string[];
}

export interface InstallationInitialValuesData {
  readonly cajaInicial: number;
  readonly ticketInicial: number;
  readonly facturaInicial: number;
}

export interface InstallationTaxData {
  readonly tipoIva: TipoIva;
  readonly ivaList: readonly number[];
  readonly reList: readonly number[];
  readonly marginList: readonly number[];
}

export interface InstallationOnlineStoreData {
  readonly active: boolean;
  readonly urlApi: string;
}

export interface InstallationOptionsData {
  readonly fechaCaducidad: boolean;
  readonly empleados: boolean;
}

export interface InstallationSecretsData {
  readonly secretApi: string;
  readonly backupApiKey: string;
  readonly emailSmtpPass: string | null;
  readonly ticketBaiToken: string | null;
}

export interface InstallationLogoData {
  readonly fileName: string;
  readonly mimeType: string;
  readonly dataUrl: string;
}

export interface InstallationCommand {
  readonly negocio: InstallationBusinessData;
  readonly empleadoInicial: InstallationEmployeeData;
  readonly redes: InstallationSocialData;
  readonly ticket: InstallationTicketData;
  readonly valoresIniciales: InstallationInitialValuesData;
  readonly fiscalidad: InstallationTaxData;
  readonly ventaOnline: InstallationOnlineStoreData;
  readonly opciones: InstallationOptionsData;
  readonly secretos: InstallationSecretsData;
  readonly logo: InstallationLogoData;
}
