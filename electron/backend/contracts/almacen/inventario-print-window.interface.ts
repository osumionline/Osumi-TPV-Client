import type InventarioPrintDocumentoInterface from '@desktop-contracts/almacen/inventario-print.interface';

export default interface InventarioPrintWindow {
  /**
   * Abre una ventana con un snapshot persistido de Inventario.
   */
  open(documento: InventarioPrintDocumentoInterface): Promise<void>;

  /**
   * Obtiene el documento únicamente para el renderer autorizado.
   */
  getDocumento(senderWebContentsId: number): InventarioPrintDocumentoInterface;

  /**
   * Abre el diálogo estándar de impresión desde el renderer autorizado.
   */
  print(senderWebContentsId: number): Promise<void>;
}
