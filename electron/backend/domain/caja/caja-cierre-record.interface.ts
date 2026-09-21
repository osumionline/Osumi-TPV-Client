export interface CajaCierreTipoPagoRecord {
  readonly publicId: string;
  readonly nombre: string;
  readonly slug: string;
  readonly afectaCaja: boolean;
  readonly orden: number;
  readonly operaciones: number;
  readonly importeVentasCents: number;
}

export interface CajaCierreRecord {
  readonly cajaPublicId: string;
  readonly apertura: string;
  readonly importeAperturaCents: number;
  readonly ventasAfectanCajaCents: number;
  readonly salidasCajaCents: number;
  readonly tiposPago: readonly CajaCierreTipoPagoRecord[];
}
