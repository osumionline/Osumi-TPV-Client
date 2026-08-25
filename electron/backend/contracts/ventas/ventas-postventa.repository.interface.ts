export default interface VentasPostventaRepository {
  /**
   * Cambia el cliente asociado a una venta persistida.
   */
  cambiarCliente(idVenta: number, clientePublicId: string | null): Promise<void>;

  /**
   * Sustituye el único medio de pago de una venta
   * reconciliando los acumulados de su caja original.
   */
  cambiarTipoPago(idVenta: number, tipoPagoPublicId: string): Promise<void>;
}
