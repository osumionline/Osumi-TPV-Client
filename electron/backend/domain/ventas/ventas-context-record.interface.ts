export interface TerminalRecord {
  readonly id: number;
  readonly publicId: string;
  readonly nombre: string;
  readonly codigo: string;
}

export interface CajaAbiertaRecord {
  readonly id: number;
  readonly publicId: string;
  readonly idTerminal: number;
  readonly apertura: string;
  readonly importeAperturaCents: number;
}

export interface TipoPagoRecord {
  readonly id: number;
  readonly publicId: string;
  readonly nombre: string;
  readonly slug: string;
  readonly fotoRelativePath: string | null;
  readonly afectaCaja: boolean;
  readonly orden: number;
  readonly fisico: boolean;
}

export interface VentasContextRecord {
  readonly terminal: TerminalRecord;
  readonly cajaAbierta: CajaAbiertaRecord | null;
  readonly tiposPago: readonly TipoPagoRecord[];
}
