export interface CajaCierreConsulta {
  readonly cajaPublicId: string;
}

export interface CajaCierreTipoPagoInterface {
  readonly publicId: string;
  readonly nombre: string;
  readonly slug: string;
  readonly afectaCaja: boolean;
  readonly orden: number;
  readonly operaciones: number;
  readonly importeVentasCents: number;
}

export interface CajaCierreInterface {
  readonly cajaPublicId: string;
  readonly apertura: string;

  readonly saldoInicialCents: number;
  readonly ventasAfectanCajaCents: number;
  readonly salidasCajaCents: number;
  readonly saldoFinalTeoricoCents: number;

  readonly tiposPago: readonly CajaCierreTipoPagoInterface[];
}
