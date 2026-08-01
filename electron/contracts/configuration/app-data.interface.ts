import type TipoIva from '@desktop-contracts/tipo-iva.type';

export default interface AppData {
  readonly schemaVersion: number;
  readonly installedAt: string;

  readonly nombre: string;
  readonly nombreComercial: string;
  readonly cif: string;
  readonly telefono: string;
  readonly direccion: string;
  readonly poblacion: string;
  readonly email: string;

  readonly twitter: string;
  readonly facebook: string;
  readonly instagram: string;
  readonly web: string;

  readonly tipoIva: TipoIva;
  readonly ivaList: readonly number[];
  readonly reList: readonly number[];
  readonly marginList: readonly number[];

  readonly ventaOnline: boolean;
  readonly urlApi: string;

  readonly fechaCad: boolean;
  readonly empleados: boolean;
}
