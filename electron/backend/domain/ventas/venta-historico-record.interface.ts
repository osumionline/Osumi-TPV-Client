export interface VentaHistoricoPagoResumenRecord {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
}

export interface VentaHistoricoResumenRecord {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
  readonly clienteNombre: string | null;
  readonly pagos: readonly VentaHistoricoPagoResumenRecord[];
  readonly tieneIncidenciaTicketBai: boolean;
}

export interface VentaHistoricoTotalTipoPagoRecord {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
}

export interface ResumenHistoricoRecord {
  readonly numeroVentas: number;
  readonly totalCents: number;
  readonly ticketMedioCents: number;
  readonly beneficioCents: number;
  readonly totalesPorTipoPago: readonly VentaHistoricoTotalTipoPagoRecord[];
}

export interface VentasHistoricoResultadoRecord {
  readonly ventas: readonly VentaHistoricoResumenRecord[];
  readonly resumen: ResumenHistoricoRecord;
}

export interface VentaHistoricoClienteRecord {
  readonly publicId: string;
  readonly nombre: string;
  readonly email: string | null;
}

export interface VentaHistoricoPagoRecord {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
  readonly entregadoCents: number | null;
  readonly cambioCents: number;
}

export interface VentaHistoricoLineaRecord {
  readonly id: number;
  readonly localizador: number;
  readonly marca: string;
  readonly descripcion: string;
  readonly unidades: number;
  readonly pvpMicros: number;
  readonly descuentoBps: number;
  readonly importeDescuentoMicros: number;
  readonly importeMicros: number;
  readonly regalo: boolean;
}

export interface VentaHistoricoDetalleRecord {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly empleadoNombre: string;
  readonly cliente: VentaHistoricoClienteRecord | null;
  readonly totalCents: number;
  readonly pagos: readonly VentaHistoricoPagoRecord[];
  readonly lineas: readonly VentaHistoricoLineaRecord[];

  /**
   * Hechos persistidos necesarios para derivar capacidades postventa.
   */
  readonly numeroPagos: number;
  readonly cajaAbierta: boolean;
  readonly facturada: boolean;
  readonly tieneLineasPositivas: boolean;
  readonly tieneIncidenciaTicketBai: boolean;
}
