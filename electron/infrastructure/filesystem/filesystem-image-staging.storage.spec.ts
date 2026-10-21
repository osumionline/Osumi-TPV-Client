import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';
import FilesystemImageStagingStorage from '@infrastructure/filesystem/filesystem-image-staging.storage';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;

describe('FilesystemImageStagingStorage', (): void => {
  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('guarda el WebP dentro del staging de drafts', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-staging-'));

    const storage = new FilesystemImageStagingStorage(tempDirectory);

    const image: ProcessedImage = createProcessedImage();

    const result: StoredImageFile = await storage.save('staging-id', image);

    expect(result).toEqual({
      internalName: 'staging-id.webp',
      relativePath: 'staging/draft-images/staging-id.webp',
    });

    const persisted: Buffer = await readFile(
      join(tempDirectory, 'draft-images', 'staging-id.webp'),
    );

    expect(persisted).toEqual(image.buffer);
  });

  it('elimina una imagen temporal', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-staging-'));

    const storage = new FilesystemImageStagingStorage(tempDirectory);

    const result: StoredImageFile = await storage.save('staging-id', createProcessedImage());

    await storage.delete(result.relativePath);

    await expect(
      readFile(join(tempDirectory, 'draft-images', 'staging-id.webp')),
    ).rejects.toThrow();
  });

  it('rechaza rutas ajenas al staging de drafts', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-staging-'));

    const storage = new FilesystemImageStagingStorage(tempDirectory);

    await expect(storage.delete('staging/../outside.webp')).rejects.toThrow(
      'La ruta no pertenece al staging de imágenes.',
    );
  });

  it('lee un WebP previamente guardado en staging', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-staging-'));

    const storage = new FilesystemImageStagingStorage(tempDirectory);

    const image: ProcessedImage = createProcessedImage();

    const stored: StoredImageFile = await storage.save('staging-id', image);

    const result: Buffer = await storage.read(stored.relativePath);

    expect(result).toEqual(image.buffer);
  });

  it('conserva el error principal cuando también falla el cleanup del temporal', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-staging-'));

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

    const storage = new FilesystemImageStagingStorage(tempDirectory, removeFile, renameFile);

    let receivedError: unknown = null;

    try {
      await storage.save('staging-id', createProcessedImage());
    } catch (error: unknown) {
      receivedError = error;
    }

    expect(receivedError).toBeInstanceOf(AggregateError);

    const aggregateError: AggregateError = receivedError as AggregateError;

    expect(aggregateError.errors).toEqual([promotionError, cleanupError]);
    expect(aggregateError.cause).toBe(cleanupError);
  });

  it('no elimina un temporal existente si writeFile devuelve EEXIST', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-staging-'));

    const directory: string = join(tempDirectory, 'draft-images');
    const temporaryPath: string = join(directory, 'staging-id.webp.tmp');

    await mkdir(directory, {
      recursive: true,
    });

    const originalContent: Buffer = Buffer.from('temporal-de-otra-operacion');

    await writeFile(temporaryPath, originalContent);

    const storage = new FilesystemImageStagingStorage(tempDirectory);

    await expect(storage.save('staging-id', createProcessedImage())).rejects.toMatchObject({
      code: 'EEXIST',
    });

    await expect(readFile(temporaryPath)).resolves.toEqual(originalContent);

    await expect(readFile(join(directory, 'staging-id.webp'))).rejects.toThrow();
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
