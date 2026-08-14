import type VentaLineaReservaOrigen from '@model/ventas/venta-linea-reserva-origen.interface';

export default interface VentaReservaOrigen {
  readonly id: number;
  readonly publicId: string;

  readonly idCliente: number;
  readonly clientePublicId: string;

  readonly lineas: readonly VentaLineaReservaOrigen[];
}
