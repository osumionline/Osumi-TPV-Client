import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type VentaDevolucionSeleccion from '@model/ventas/venta-devolucion-seleccion.interface';

export default interface VentaDevolucionSelectorState {
  readonly devolucion: VentaDevolucionInterface;
  readonly seleccionInicial: readonly VentaDevolucionSeleccion[];
}
