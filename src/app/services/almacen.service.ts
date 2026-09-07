import { Service } from '@angular/core';
import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario.interface';

/**
 * Expone al frontend los casos de uso del módulo Almacén.
 */
@Service()
export default class AlmacenService {
  /**
   * Recupera una página persistida de Inventario.
   */
  searchInventario(consulta: InventarioConsulta): Promise<InventarioResultado> {
    return window.osumiDesktop.almacen.searchInventario(consulta);
  }
}
