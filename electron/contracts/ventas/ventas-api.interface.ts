import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type VentasContextInterface from '@desktop-contracts/ventas/ventas-context.interface';

export default interface VentasApi {
  getContext(): Promise<VentasContextInterface>;

  resolveArticulo(codigo: string): Promise<ArticuloVentaInterface | null>;

  searchArticulos(query: string): Promise<readonly ArticuloVentaInterface[]>;

  getAccesosDirectos(): Promise<readonly AccesoDirectoVentaInterface[]>;

  getDevolucion(idVenta: number): Promise<VentaDevolucionInterface | null>;
}
