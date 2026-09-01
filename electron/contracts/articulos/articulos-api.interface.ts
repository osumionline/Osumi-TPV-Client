import type ArticuloAccesoDirectoCommand from '@desktop-contracts/articulos/articulo-acceso-directo-command.interface';
import type ArticuloAccesoDirectoInterface from '@desktop-contracts/articulos/articulo-acceso-directo.interface';
import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';

export default interface ArticulosApi {
  /**
   * Obtiene el detalle de un artículo activo.
   */
  getById(idArticulo: number): Promise<ArticuloInterface | null>;

  /**
   * Resuelve un localizador, acceso directo o código de barras
   * y devuelve el artículo correspondiente.
   */
  resolveByCode(codigo: string): Promise<ArticuloInterface | null>;

  /**
   * Obtiene todos los accesos directos asignados.
   */
  getAccesosDirectos(): Promise<readonly ArticuloAccesoDirectoInterface[]>;

  /**
   * Asigna o elimina el acceso directo de un artículo.
   */
  setAccesoDirecto(command: ArticuloAccesoDirectoCommand): Promise<void>;
}
