export interface VentaHistoricoConsulta {
  /**
   * Primera fecha local incluida en la consulta, en formato YYYY-MM-DD.
   */
  readonly desde: string;

  /**
   * Última fecha local incluida en la consulta, en formato YYYY-MM-DD.
   */
  readonly hasta: string;
}

export type VentaHistoricoTicketBaiEstado = 'no_aplica' | 'correcto' | 'pendiente' | 'incidencia';

export interface VentaHistoricoPagoResumen {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
}

export interface VentaHistoricoResumen {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly totalCents: number;
  readonly clienteNombre: string | null;
  readonly pagos: readonly VentaHistoricoPagoResumen[];
  readonly ticketBaiEstado: VentaHistoricoTicketBaiEstado;
  readonly tieneIncidenciaTicketBai: boolean;
}

export interface VentaHistoricoTotalTipoPago {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
}

export interface ResumenHistorico {
  readonly numeroVentas: number;
  readonly totalCents: number;
  readonly ticketMedioCents: number;
  readonly beneficioCents: number;
  readonly totalesPorTipoPago: readonly VentaHistoricoTotalTipoPago[];
}

export interface VentasHistoricoResultado {
  readonly ventas: readonly VentaHistoricoResumen[];
  readonly resumen: ResumenHistorico;
}

export interface VentaHistoricoCliente {
  readonly publicId: string;
  readonly nombre: string;
  readonly email: string | null;
}

export interface VentaHistoricoPago {
  readonly tipoPagoPublicId: string;
  readonly nombre: string;
  readonly importeCents: number;
  readonly entregadoCents: number | null;
  readonly cambioCents: number;
}

export interface VentaHistoricoLinea {
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

export interface VentaHistoricoCapacidades {
  readonly puedeCambiarCliente: boolean;
  readonly puedeCambiarTipoPago: boolean;
  readonly puedeImprimirTicketRegalo: boolean;
  readonly puedeProcesarTicketBai: boolean;
  readonly puedeComprobarTicketBai: boolean;
  readonly puedeReintentarTicketBai: boolean;
}

export interface VentaHistoricoDetalle {
  readonly id: number;
  readonly publicId: string;
  readonly serie: string;
  readonly numero: number;
  readonly fecha: string;
  readonly empleadoNombre: string;
  readonly cliente: VentaHistoricoCliente | null;
  readonly totalCents: number;
  readonly pagos: readonly VentaHistoricoPago[];
  readonly lineas: readonly VentaHistoricoLinea[];
  readonly totalUnidades: number;
  readonly totalDescuentoMicros: number;
  readonly ticketBaiEstado: VentaHistoricoTicketBaiEstado;
  readonly capacidades: VentaHistoricoCapacidades;
}
