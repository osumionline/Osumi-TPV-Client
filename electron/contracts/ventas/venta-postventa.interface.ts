export interface VentaPostventaCambiarClienteCommand {
  readonly idVenta: number;
  readonly clientePublicId: string | null;
}

export interface VentaPostventaCambiarTipoPagoCommand {
  readonly idVenta: number;
  readonly tipoPagoPublicId: string;
}
