export const IMPRENTA_DEFAULT_ROWS: number = 5;
export const IMPRENTA_DEFAULT_COLUMNS: number = 4;
export const IMPRENTA_MAX_ROWS: number = 10;
export const IMPRENTA_MAX_COLUMNS: number = 10;
export const IMPRENTA_DEFAULT_ORIENTATION: ImprentaOrientation = 'portrait';
export const IMPRENTA_DEFAULT_SHOW_PVP: boolean = true;

export type ImprentaOrientation = 'portrait' | 'landscape';

export interface ImprentaPrintArticuloCommand {
  readonly tipo: 'articulo';
  readonly idArticulo: number;
  readonly cantidad: number;
}

export interface ImprentaPrintHuecoCommand {
  readonly tipo: 'hueco';
}

export type ImprentaPrintItemCommand = ImprentaPrintArticuloCommand | ImprentaPrintHuecoCommand;

export interface ImprentaPrintCommand {
  readonly filas: number;
  readonly columnas: number;
  readonly orientacion: ImprentaOrientation;
  readonly mostrarPvp: boolean;
  readonly items: readonly ImprentaPrintItemCommand[];
}

export interface ImprentaPrintArticuloInterface {
  readonly idArticulo: number;
  readonly localizador: number;
  readonly marcaNombre: string | null;
  readonly nombre: string;
  readonly pvpCents: number;
}

export interface ImprentaPrintArticuloSlotInterface {
  readonly tipo: 'articulo';
  readonly articulo: ImprentaPrintArticuloInterface;
}

export interface ImprentaPrintEmptySlotInterface {
  readonly tipo: 'hueco' | 'libre';
  readonly articulo: null;
}

export type ImprentaPrintSlotInterface =
  ImprentaPrintArticuloSlotInterface | ImprentaPrintEmptySlotInterface;

export interface ImprentaPrintDocumentoInterface {
  readonly filas: number;
  readonly columnas: number;
  readonly orientacion: ImprentaOrientation;
  readonly mostrarPvp: boolean;
  readonly slots: readonly ImprentaPrintSlotInterface[];
}
