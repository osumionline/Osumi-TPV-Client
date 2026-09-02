import type ArticuloAccesoDirectoCommand from '@desktop-contracts/articulos/articulo-acceso-directo-command.interface';
import type ArticuloAccesoDirectoInterface from '@desktop-contracts/articulos/articulo-acceso-directo.interface';
import type {
  ArticuloEstadisticasConsulta,
  ArticuloEstadisticasResultado,
} from '@desktop-contracts/articulos/articulo-estadisticas.interface';
import type {
  ArticuloHistoricoConsulta,
  ArticuloHistoricoResultado,
} from '@desktop-contracts/articulos/articulo-historico.interface';
import type { ArticuloSaveInterface } from '@desktop-contracts/articulos/articulo-save.interface';
import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';

export default interface ArticulosApi {
  /**
   * Obtiene el detalle de un artículo activo.
   */
  getById(idArticulo: number): Promise<ArticuloInterface | null>;

  /**
   * Resuelve un localizador, acceso directo o código de barras
   * y devuelve el artículo correspondiente.
   */
  resolveByCode(codigo: string): Promise<ArticuloInterface | null>;

  /**
   * Obtiene una página del histórico de un artículo.
   */
  getHistorico(consulta: ArticuloHistoricoConsulta): Promise<ArticuloHistoricoResultado>;

  /**
   * Obtiene las estadísticas de ventas de un artículo.
   */
  getEstadisticas(consulta: ArticuloEstadisticasConsulta): Promise<ArticuloEstadisticasResultado>;

  /**
   * Obtiene todos los accesos directos asignados.
   */
  getAccesosDirectos(): Promise<readonly ArticuloAccesoDirectoInterface[]>;

  /**
   * Asigna o elimina el acceso directo de un artículo.
   */
  setAccesoDirecto(command: ArticuloAccesoDirectoCommand): Promise<void>;

  /**
   * Crea o actualiza un artículo completo.
   */
  save(command: ArticuloSaveInterface): Promise<ArticuloInterface>;

  /**
   * Da de baja lógicamente un artículo activo.
   */
  deactivate(idArticulo: number): Promise<void>;
}
