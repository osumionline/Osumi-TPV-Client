import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';

export default interface MarcasApi {
  getAll(): Promise<readonly MarcaInterface[]>;
  create(command: CrearMarcaCommand): Promise<MarcaInterface>;
}
