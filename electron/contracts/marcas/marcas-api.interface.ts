import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';

export default interface MarcasApi {
  getAll(): Promise<readonly MarcaInterface[]>;
}
