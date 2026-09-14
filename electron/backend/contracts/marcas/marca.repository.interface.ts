import type ActualizarMarcaRecordCommand from '@backend/contracts/marcas/actualizar-marca-record-command.interface';
import type CrearMarcaRecordCommand from '@backend/contracts/marcas/crear-marca-record-command.interface';
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
