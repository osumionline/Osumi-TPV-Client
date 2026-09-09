import type { ImprentaPrintDocumentoInterface } from '@desktop-contracts/almacen/imprenta-print.interface';

export default interface ImprentaPrintApi {
  /**
   * Obtiene el snapshot asignado exclusivamente a esta ventana.
   */
  getDocumento(): Promise<ImprentaPrintDocumentoInterface>;
}
