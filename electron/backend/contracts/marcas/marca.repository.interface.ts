import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
import type MarcaEstadisticasRepositoryQuery from '@backend/contracts/marcas/marca-estadisticas-query.interface';
import type { MarcaEstadisticasRepositoryResult } from '@backend/domain/marcas/marca-estadisticas-record.interface';
import type MarcaRecord from '@backend/domain/marcas/marca-record.interface';

export default interface MarcaRepository {
  /**
   * Recupera todas las marcas activas ordenadas
   * para su uso como maestro.
   */
  findAll(): Promise<readonly MarcaRecord[]>;

  /**
   * Recupera una marca activa por su identificador interno.
   */
  findById(id: number): Promise<MarcaRecord | null>;

  /**
   * Recupera los agregados históricos de ventas
   * correspondientes a una Marca.
   */
  findEstadisticas(
    query: MarcaEstadisticasRepositoryQuery,
  ): Promise<MarcaEstadisticasRepositoryResult>;

  /**
   * Comprueba si existe otra marca activa con el nombre indicado.
   */
  existsActiveByName(nombre: string, excludeId: number | null): Promise<boolean>;

  /**
   * Crea una nueva marca, persiste su logo si procede
   * y devuelve su estado definitivo.
   */
  create(command: CrearMarcaRecordCommand): Promise<MarcaRecord>;

  /**
   * Actualiza los datos y el estado del logo
   * de una marca activa.
   */
  update(id: number, command: ActualizarMarcaRecordCommand): Promise<MarcaRecord>;

  /**
   * Da de baja lógicamente una marca activa.
   */
  deactivate(id: number): Promise<void>;
}
