import type { VentaDevolucionLineaInterface } from '@desktop-contracts/ventas/venta-devolucion.interface';

export default interface VentaDevolucionSeleccion {
  readonly linea: VentaDevolucionLineaInterface;
  readonly unidades: number;
}
