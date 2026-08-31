import ImageAssetsService from '@backend/application/files/image-assets.service';
import type ArchivosRepository from '@backend/contracts/files/archivos.repository.interface';
import type ImageFileStorage from '@backend/contracts/system/image-file-storage.interface';
import type {
  ImageProcessor,
  ProcessedImage,
} from '@backend/contracts/system/image-processor.interface';
import type {
  ArchivoCreateRecord,
  ArchivoRecord,
} from '@backend/domain/files/archivo-record.interface';
import type {
  ImageAssetPurpose,
  StoredImageFile,
} from '@backend/domain/files/image-asset.interface';
import { describe, expect, it } from 'vitest';

class FakeImageProcessor implements ImageProcessor {
  /**
   * Devuelve un WebP procesado predecible.
   */
  convertToWebp(): Promise<ProcessedImage> {
    const buffer: Buffer = Buffer.from('processed-webp');

    return Promise.resolve({
      buffer,
      mimeType: 'image/webp',
      extension: '.webp',
      sizeBytes: buffer.length,
      sha256: 'a'.repeat(64),
      width: 800,
      height: 600,
    });
  }
}

class FakeImageFileStorage implements ImageFileStorage {
  deletedPath: string | null = null;

  /**
   * Simula el guardado físico de una imagen.
   */
  save(purpose: ImageAssetPurpose, publicId: string): Promise<StoredImageFile> {
    const directory: string = purpose === 'article_image' ? 'articles' : 'other';

    return Promise.resolve({
      internalName: `${publicId}.webp`,
      relativePath: `files/${directory}/${publicId}.webp`,
    });
  }

  /**
   * Registra el archivo eliminado.
   */
  delete(relativePath: string): Promise<void> {
    this.deletedPath = relativePath;

    return Promise.resolve();
  }
}

class FakeArchivosRepository implements ArchivosRepository {
  shouldFail: boolean = false;
  created: ArchivoCreateRecord | null = null;

  /**
   * Simula el registro SQLite del archivo.
   */
  create(command: ArchivoCreateRecord): Promise<ArchivoRecord> {
    this.created = command;

    if (this.shouldFail) {
      return Promise.reject(new Error('Database error'));
    }

    return Promise.resolve({
      id: 15,
      ...command,
    });
  }
}

describe('ImageAssetsService', (): void => {
  it('procesa, almacena y registra una imagen', async (): Promise<void> => {
    const repository = new FakeArchivosRepository();
    const storage = new FakeImageFileStorage();
    const service = new ImageAssetsService(new FakeImageProcessor(), storage, repository);

    const result: ArchivoRecord = await service.create({
      purpose: 'article_image',
      originalName: 'foto.jpg',
      buffer: Buffer.from('original'),
    });

    expect(result.id).toBe(15);
    expect(result.mimeType).toBe('image/webp');
    expect(result.originalName).toBe('foto.jpg');
    expect(result.relativePath).toMatch(/^files\/articles\/.+\.webp$/);
    expect(storage.deletedPath).toBeNull();
  });

  it('elimina el fichero si falla el registro SQLite', async (): Promise<void> => {
    const repository = new FakeArchivosRepository();
    repository.shouldFail = true;

    const storage = new FakeImageFileStorage();
    const service = new ImageAssetsService(new FakeImageProcessor(), storage, repository);

    await expect(
      service.create({
        purpose: 'article_image',
        originalName: 'foto.png',
        buffer: Buffer.from('original'),
      }),
    ).rejects.toThrow('Database error');

    expect(storage.deletedPath).toMatch(/^files\/articles\/.+\.webp$/);
  });
});
