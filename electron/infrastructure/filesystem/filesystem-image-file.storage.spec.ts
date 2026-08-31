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
