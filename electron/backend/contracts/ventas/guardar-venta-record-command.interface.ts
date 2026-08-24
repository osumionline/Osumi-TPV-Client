export interface GuardarVentaPagoRecordCommand {
  readonly tipoPagoPublicId: string;
  readonly importeCents: number;
  readonly entregadoCents: number | null;
  readonly cambioCents: number;
}

export interface GuardarVentaLineaRecordCommand {
  readonly articuloPublicId: string | null;
  readonly localizador: number;
  readonly marca: string;
  readonly nombre: string;
  readonly pucMicros: number;
  readonly pvpMicros: number;
  readonly ivaBps: number;
  readonly importeMicros: number;
  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;
  readonly unidades: number;
  readonly regalo: boolean;
  readonly devolucionLineaOrigenPublicId: string | null;
  readonly reservaLineaOrigenPublicId: string | null;
}

export interface GuardarVentaRecordCommand {
  readonly publicId: string;

  readonly cajaPublicId: string;
  readonly empleadoPublicId: string;
  readonly clientePublicId: string | null;

  readonly devolucionVentaOrigenPublicId: string | null;
  readonly reservasOrigenPublicIds: readonly string[];

  readonly totalCents: number;
  readonly lineas: readonly GuardarVentaLineaRecordCommand[];
  readonly pagos: readonly GuardarVentaPagoRecordCommand[];
}
