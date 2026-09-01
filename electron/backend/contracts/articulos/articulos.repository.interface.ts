import type {
  ArticuloAccesoDirectoRecord,
  ArticuloRecord,
} from '@backend/domain/articulos/articulo-record.interface';
import type { ArticuloSaveRecord } from '@backend/domain/articulos/articulo-save-record.interface';

export default interface ArticulosRepository {
  /**
   * Obtiene un artículo activo mediante su identificador interno.
   */
  findById(idArticulo: number): Promise<ArticuloRecord | null>;

  /**
   * Resuelve localizador, acceso directo o código de barras
   * y devuelve el identificador del artículo activo.
   */
  resolveIdByCode(codigo: string, codigoNumerico: number | null): Promise<number | null>;

  /**
   * Obtiene los accesos directos asignados a artículos activos.
   */
  findAccesosDirectos(): Promise<readonly ArticuloAccesoDirectoRecord[]>;

  /**
   * Asigna, modifica o elimina el acceso directo de un artículo.
   */
  setAccesoDirecto(idArticulo: number, accesoDirecto: number | null): Promise<void>;

  /**
   * Crea un nuevo artículo y devuelve su identificador interno.
   */
  create(command: ArticuloSaveRecord): Promise<number>;

  /**
   * Actualiza un artículo existente.
   */
  update(command: ArticuloSaveRecord): Promise<void>;

  /**
   * Da de baja lógicamente un artículo activo.
   */
  deactivate(idArticulo: number): Promise<void>;
}
