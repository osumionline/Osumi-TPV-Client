import type ActualizarMarcaCommand from '@desktop-contracts/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import type {
  MarcaEstadisticasConsulta,
  MarcaEstadisticasResultado,
} from '@desktop-contracts/marcas/marca-estadisticas.interface';

export default interface MarcasApi {
  /**
   * Recupera el maestro completo de marcas activas.
   */
  getAll(): Promise<readonly MarcaInterface[]>;

  /**
   * Recupera una marca activa por su identificador interno.
   */
  getById(id: number): Promise<MarcaInterface | null>;
  
  /**
 * Recupera las estadísticas históricas
 * correspondientes a una Marca.
 */
getEstadisticas(
  consulta: MarcaEstadisticasConsulta,
): Promise<MarcaEstadisticasResultado>;

  /**
   * Crea una nueva marca.
   */
  create(command: CrearMarcaCommand): Promise<MarcaInterface>;

  /**
   * Actualiza los datos editables de una marca activa.
   */
  update(id: number, command: ActualizarMarcaCommand): Promise<MarcaInterface>;

  /**
   * Da de baja lógicamente una marca activa.
   */
  deactivate(id: number): Promise<void>;
}
