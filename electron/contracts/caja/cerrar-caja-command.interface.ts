export interface CerrarCajaRecuentoCommand {
  readonly valorCents: number;
  readonly cantidad: number;
}

export interface CerrarCajaTipoPagoCommand {
  readonly tipoPagoPublicId: string;
  readonly importeRealCents: number;
}

export interface CerrarCajaCommand {
  readonly cajaPublicId: string;

  readonly retiradoCents: number;
  readonly entradaCents: number;

  readonly recuento: readonly CerrarCajaRecuentoCommand[];

  readonly tiposPago: readonly CerrarCajaTipoPagoCommand[];
}
