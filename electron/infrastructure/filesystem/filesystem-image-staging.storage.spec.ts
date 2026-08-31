import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';
import FilesystemImageStagingStorage from '@infrastructure/filesystem/filesystem-image-staging.storage';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
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
