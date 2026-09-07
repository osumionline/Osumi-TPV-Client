import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario.interface';

/**
 * Expone los casos de uso disponibles del módulo Almacén.
 */
export default interface AlmacenApi {
  /**
   * Recupera una página filtrada del inventario y sus agregados globales.
   */
  searchInventario(consulta: InventarioConsulta): Promise<InventarioResultado>;
}
