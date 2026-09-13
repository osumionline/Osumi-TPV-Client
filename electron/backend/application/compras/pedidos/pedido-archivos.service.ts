import type PedidoArchivoDialog from '@backend/contracts/compras/pedidos/pedido-archivo-dialog.interface';
import type PedidoArchivoStorage from '@backend/contracts/compras/pedidos/pedido-archivo-storage.interface';
import type PedidoArchivosRepository from '@backend/contracts/compras/pedidos/pedido-archivos.repository.interface';
import type PedidoArchivoCreateRecord from '@backend/domain/compras/pedidos/pedido-archivo-create-record.interface';
import type { PedidoArchivoRecord } from '@backend/domain/compras/pedidos/pedido-archivo-record.interface';
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
