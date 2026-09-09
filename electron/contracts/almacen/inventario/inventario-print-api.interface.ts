import type InventarioPrintDocumentoInterface from '@desktop-contracts/almacen/inventario/inventario-print.interface';

export default interface InventarioPrintApi {
  /**
   * Obtiene el snapshot asociado exclusivamente a esta ventana.
   */
  getDocumento(): Promise<InventarioPrintDocumentoInterface>;

  /**
   * Abre el diálogo estándar de impresión del sistema.
   */
  print(): Promise<void>;
}
