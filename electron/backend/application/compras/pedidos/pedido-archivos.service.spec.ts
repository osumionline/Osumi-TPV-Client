import PedidoArchivosService from '@backend/application/compras/pedidos/pedido-archivos.service';
import type PedidoArchivoDialog from '@backend/contracts/compras/pedidos/pedido-archivo-dialog.interface';
import type PedidoArchivoStorage from '@backend/contracts/compras/pedidos/pedido-archivo-storage.interface';
import type PedidoArchivosRepository from '@backend/contracts/compras/pedidos/pedido-archivos.repository.interface';
import type PedidoArchivoCreateRecord from '@backend/domain/compras/pedidos/pedido-archivo-create-record.interface';
import type { PedidoArchivoRecord } from '@backend/domain/compras/pedidos/pedido-archivo-record.interface';
import type PedidoArchivoStoredRecord from '@backend/domain/compras/pedidos/pedido-archivo-stored-record.interface';
import type { PedidoArchivoInterface } from '@desktop-contracts/compras/pedidos/pedido-archivo.interface';
import { describe, expect, it } from 'vitest';

class FakePedidoArchivoDialog implements PedidoArchivoDialog {
  selectedPath: string | null = '/tmp/factura.pdf';

  calls: number = 0;

  async selectPdf(): Promise<string | null> {
    this.calls++;

    return this.selectedPath;
  }
}

class FakePedidoArchivoStorage implements PedidoArchivoStorage {
  savedPublicId: string | null = null;

  savedSourcePath: string | null = null;

  removedPublicId: string | null = null;

  async save(publicId: string, sourcePath: string): Promise<PedidoArchivoStoredRecord> {
    this.savedPublicId = publicId;
    this.savedSourcePath = sourcePath;

    return {
      originalName: 'factura.pdf',
      internalName: `${publicId}.pdf`,
      relativePath: `files/orders/${publicId}.pdf`,
      mimeType: 'application/pdf',
      sizeBytes: 1234,
      sha256: 'a'.repeat(64),
    };
  }

  async remove(publicId: string): Promise<void> {
    this.removedPublicId = publicId;
  }
}

class FakePedidoArchivosRepository implements PedidoArchivosRepository {
  lastCommand: PedidoArchivoCreateRecord | null = null;

  fail: boolean = false;

  async createPedidoArchivo(command: PedidoArchivoCreateRecord): Promise<PedidoArchivoRecord> {
    this.lastCommand = command;

    if (this.fail) {
      throw new Error('Error de persistencia');
    }

    return {
      id: 91,
      publicId: command.relacionPublicId,
      idArchivo: 81,
      tipo: 'factura',
      nombre: command.storedFile.originalName,
      mimeType: command.storedFile.mimeType,
      sizeBytes: command.storedFile.sizeBytes,
      createdAt: '2026-09-13T20:00:00.000Z',
    };
  }
}

describe('PedidoArchivosService', (): void => {
  it('selecciona almacena y registra un PDF', async (): Promise<void> => {
    const dialog = new FakePedidoArchivoDialog();

    const storage = new FakePedidoArchivoStorage();

    const repository = new FakePedidoArchivosRepository();

    const service = new PedidoArchivosService(repository, dialog, storage);

    const result: PedidoArchivoInterface | null = await service.attachPdf(3);

    expect(result).toMatchObject({
      id: 91,
      tipo: 'factura',
      nombre: 'factura.pdf',
      mimeType: 'application/pdf',
      sizeBytes: 1234,
    });

    expect(repository.lastCommand?.idPedido).toBe(3);

    expect(repository.lastCommand?.archivoPublicId).toBe(storage.savedPublicId);

    expect(storage.savedSourcePath).toBe('/tmp/factura.pdf');
  });

  it('no almacena nada cuando el usuario cancela', async (): Promise<void> => {
    const dialog = new FakePedidoArchivoDialog();

    dialog.selectedPath = null;

    const storage = new FakePedidoArchivoStorage();

    const repository = new FakePedidoArchivosRepository();

    const service = new PedidoArchivosService(repository, dialog, storage);

    await expect(service.attachPdf(1)).resolves.toBeNull();

    expect(storage.savedPublicId).toBeNull();

    expect(repository.lastCommand).toBeNull();
  });

  it('rechaza un Pedido inválido antes de abrir el selector', async (): Promise<void> => {
    const dialog = new FakePedidoArchivoDialog();

    const service = new PedidoArchivosService(
      new FakePedidoArchivosRepository(),
      dialog,
      new FakePedidoArchivoStorage(),
    );

    await expect(service.attachPdf(0)).rejects.toThrow('El identificador del pedido no es válido.');

    expect(dialog.calls).toBe(0);
  });

  it('elimina el archivo físico cuando falla SQLite', async (): Promise<void> => {
    const repository = new FakePedidoArchivosRepository();

    repository.fail = true;

    const storage = new FakePedidoArchivoStorage();

    const service = new PedidoArchivosService(repository, new FakePedidoArchivoDialog(), storage);

    await expect(service.attachPdf(1)).rejects.toThrow('Error de persistencia');

    expect(storage.removedPublicId).toBe(storage.savedPublicId);
  });
});
