import { Service } from '@angular/core';
import type { InventarioSaveCommand } from '@desktop-contracts/almacen/inventario-save.interface';
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

  /**
   * Persiste una fila modificada de Inventario.
   */
  saveInventarioRow(command: InventarioSaveCommand): Promise<void> {
    return window.osumiDesktop.almacen.saveInventarioRow(command);
  }

  /**
   * Persiste atómicamente todas las filas modificadas.
   */
  saveInventarioRows(commands: readonly InventarioSaveCommand[]): Promise<void> {
    return window.osumiDesktop.almacen.saveInventarioRows(commands);
  }

  /**
   * Da de baja un artículo desde Inventario.
   */
  deactivateArticulo(idArticulo: number): Promise<void> {
    return window.osumiDesktop.almacen.deactivateArticulo(idArticulo);
  }
}
