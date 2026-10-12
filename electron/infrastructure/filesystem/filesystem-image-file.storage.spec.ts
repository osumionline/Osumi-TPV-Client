import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';
import FilesystemImageFileStorage from '@infrastructure/filesystem/filesystem-image-file.storage';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;

describe('FilesystemImageFileStorage', (): void => {
  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('guarda un WebP dentro de la carpeta correspondiente', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-images-'));

    const storage = new FilesystemImageFileStorage(tempDirectory);
    const image: ProcessedImage = createProcessedImage();

    const result: StoredImageFile = await storage.save('article_image', 'test-public-id', image);

    expect(result).toEqual({
      internalName: 'test-public-id.webp',
      relativePath: 'files/articles/test-public-id.webp',
    });

    const persisted: Buffer = await readFile(
      join(tempDirectory, 'articles', 'test-public-id.webp'),
    );

    expect(persisted).toEqual(image.buffer);
  });

  it('guarda un logo de Proveedor en su directorio específico', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-images-'));

    const storage = new FilesystemImageFileStorage(tempDirectory);

    const image: ProcessedImage = createProcessedImage();

    const result: StoredImageFile = await storage.save(
      'provider_image',
      'provider-public-id',
      image,
    );

    expect(result).toEqual({
      internalName: 'provider-public-id.webp',
      relativePath: 'files/providers/provider-public-id.webp',
    });

    const persisted: Buffer = await readFile(
      join(tempDirectory, 'providers', 'provider-public-id.webp'),
    );

    expect(persisted).toEqual(image.buffer);
  });

  it('elimina un archivo administrado', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-images-'));

    const storage = new FilesystemImageFileStorage(tempDirectory);

    const result: StoredImageFile = await storage.save(
      'brand_image',
      'brand-public-id',
      createProcessedImage(),
    );

    await storage.delete(result.relativePath);

    await expect(readFile(join(tempDirectory, 'brands', 'brand-public-id.webp'))).rejects.toThrow();
  });

  it('rechaza rutas que intentan escapar del storage', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-images-'));

    const storage = new FilesystemImageFileStorage(tempDirectory);

    await expect(storage.delete('files/../outside.webp')).rejects.toThrow(
      'La ruta del archivo no es válida.',
    );
  });

  it('conserva el error principal cuando también falla el cleanup del temporal', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-images-'));

    const promotionError: Error = new Error('No se ha podido promover el temporal.');
    const cleanupError: Error = new Error('No se ha podido limpiar el temporal.');

    const removeFile = async (
      filePath: string,
      options: {
        readonly force: boolean;
      },
    ): Promise<void> => {
      void filePath;
      void options;

      throw cleanupError;
    };

    const renameFile = async (oldPath: string, newPath: string): Promise<void> => {
      void oldPath;
      void newPath;

      throw promotionError;
    };

    const storage = new FilesystemImageFileStorage(tempDirectory, removeFile, renameFile);

    let receivedError: unknown = null;

    try {
      await storage.save('article_image', 'article-public-id', createProcessedImage());
    } catch (error: unknown) {
      receivedError = error;
    }

    expect(receivedError).toBeInstanceOf(AggregateError);

    const aggregateError: AggregateError = receivedError as AggregateError;

    expect(aggregateError.errors).toEqual([promotionError, cleanupError]);
    expect(aggregateError.cause).toBe(cleanupError);
  });
});

/**
 * Crea una imagen procesada mínima para los tests.
 */
function createProcessedImage(): ProcessedImage {
  const buffer: Buffer = Buffer.from('fake-webp');

  return {
    buffer,
    mimeType: 'image/webp',
    extension: '.webp',
    sizeBytes: buffer.length,
    sha256: 'a'.repeat(64),
    width: 100,
    height: 50,
  };
}
