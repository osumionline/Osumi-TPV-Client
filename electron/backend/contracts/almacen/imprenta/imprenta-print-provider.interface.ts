import type { ImprentaPrintArticuloInterface } from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';

export default interface ImprentaPrintProvider {
  /**
   * Recupera el estado persistido actual de los artículos solicitados.
   */
  getImprentaPrintArticulos(
    idsArticulos: readonly number[],
  ): Promise<readonly ImprentaPrintArticuloInterface[]>;
}
