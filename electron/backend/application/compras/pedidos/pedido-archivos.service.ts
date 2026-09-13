import type PedidoArchivoDialog from '@backend/contracts/compras/pedidos/pedido-archivo-dialog.interface';
import type PedidoArchivoStorage from '@backend/contracts/compras/pedidos/pedido-archivo-storage.interface';
import type PedidoArchivosRepository from '@backend/contracts/compras/pedidos/pedido-archivos.repository.interface';
import type PedidoArchivoCreateRecord from '@backend/domain/compras/pedidos/pedido-archivo-create-record.interface';
import type { PedidoArchivoRecord } from '@backend/domain/compras/pedidos/pedido-archivo-record.interface';
import type {
  PedidoArchivoDeleteResultRecord,
  PedidoArchivoResourceRecord,
} from '@backend/domain/compras/pedidos/pedido-archivo-resource-record.interface';
import type PedidoArchivoStoredRecord from '@backend/domain/compras/pedidos/pedido-archivo-stored-record.interface';
import type { PedidoArchivoInterface } from '@desktop-contracts/compras/pedidos/pedido-archivo.interface';
import { randomUUID } from 'node:crypto';

/**
 * Coordina selección, almacenamiento físico y
 * persistencia de PDFs relacionados con Pedidos.
 */
export default class PedidoArchivosService {
  constructor(
    private readonly repository: PedidoArchivosRepository,
    private readonly dialog: PedidoArchivoDialog,
    private readonly storage: PedidoArchivoStorage,
  ) {}

  /**
   * Selecciona y adjunta un PDF al Pedido indicado.
   * Devuelve null cuando el usuario cancela.
   */
  async attachPdf(idPedido: number): Promise<PedidoArchivoInterface | null> {
    this.validatePedidoId(idPedido);

    const sourcePath: string | null = await this.dialog.selectPdf();

    if (sourcePath === null) {
      return null;
    }

    const archivoPublicId: string = randomUUID();

    const relacionPublicId: string = randomUUID();

    const storedFile: PedidoArchivoStoredRecord = await this.storage.save(
      archivoPublicId,
      sourcePath,
    );

    const command: PedidoArchivoCreateRecord = {
      idPedido,
      archivoPublicId,
      relacionPublicId,
      storedFile,
    };

    try {
      const record: PedidoArchivoRecord = await this.repository.createPedidoArchivo(command);

      return this.mapPublic(record);
    } catch (error: unknown) {
      await this.removeStoredFileSafely(archivoPublicId);

      throw error;
    }
  }

  /**
   * Abre con el sistema operativo un PDF relacionado
   * exactamente con el Pedido indicado.
   */
  async openPdf(idPedido: number, idPedidoArchivo: number): Promise<void> {
    this.validatePedidoId(idPedido);

    this.validatePedidoArchivoId(idPedidoArchivo);

    const resource: PedidoArchivoResourceRecord | null =
      await this.repository.getPedidoArchivoResource(idPedido, idPedidoArchivo);

    if (resource === null) {
      throw new Error('El PDF indicado no pertenece al pedido.');
    }

    await this.storage.open(resource.archivoPublicId);
  }

  /**
   * Elimina la relación del PDF y limpia el fichero
   * físico cuando ya no existe ninguna referencia.
   */
  async deletePdf(idPedido: number, idPedidoArchivo: number): Promise<void> {
    this.validatePedidoId(idPedido);

    this.validatePedidoArchivoId(idPedidoArchivo);

    const result: PedidoArchivoDeleteResultRecord = await this.repository.deletePedidoArchivo(
      idPedido,
      idPedidoArchivo,
    );

    if (!result.removePhysicalFile) {
      return;
    }

    await this.removeDeletedStoredFileSafely(result.archivoPublicId);
  }

  /**
   * Valida la identidad de una relación de archivo
   * recibida desde el renderer.
   */
  private validatePedidoArchivoId(idPedidoArchivo: number): void {
    if (!Number.isSafeInteger(idPedidoArchivo) || idPedidoArchivo <= 0) {
      throw new Error('El identificador del PDF no es válido.');
    }
  }

  /**
   * Elimina un fichero ya desvinculado sin convertir
   * un posible huérfano físico en un fallo lógico.
   */
  private async removeDeletedStoredFileSafely(publicId: string): Promise<void> {
    try {
      await this.storage.remove(publicId);
    } catch (cleanupError: unknown) {
      console.error(
        'No se ha podido eliminar físicamente un PDF de Pedido ya desvinculado:',
        cleanupError,
      );
    }
  }

  /**
   * Convierte el record interno en el contrato
   * seguro utilizado por el renderer.
   */
  private mapPublic(record: PedidoArchivoRecord): PedidoArchivoInterface {
    return {
      id: record.id,
      publicId: record.publicId,
      tipo: record.tipo,
      nombre: record.nombre,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      createdAt: record.createdAt,
    };
  }

  /**
   * Valida el identificador del Pedido antes
   * de abrir ningún diálogo nativo.
   */
  private validatePedidoId(idPedido: number): void {
    if (!Number.isSafeInteger(idPedido) || idPedido <= 0) {
      throw new Error('El identificador del pedido no es válido.');
    }
  }

  /**
   * Limpia el archivo físico cuando SQLite no
   * ha podido registrar su relación.
   */
  private async removeStoredFileSafely(publicId: string): Promise<void> {
    try {
      await this.storage.remove(publicId);
    } catch (cleanupError: unknown) {
      console.error(
        'No se ha podido limpiar un PDF de Pedido cuya persistencia ha fallado:',
        cleanupError,
      );
    }
  }
}
