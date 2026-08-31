import ImageStagingService from '@backend/application/files/image-staging.service';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type {
  ImageProcessor,
  ProcessedImage,
} from '@backend/contracts/system/image-processor.interface';
import type ImageStagingStorage from '@backend/contracts/system/image-staging-storage.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';
import type StagedImageRecord from '@backend/domain/files/staged-image-record.interface';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import { describe, expect, it } from 'vitest';

class FakeImageProcessor implements ImageProcessor {
  /**
   * Devuelve un WebP procesado predecible.
   */
  convertToWebp(): Promise<ProcessedImage> {
    const buffer: Buffer = Buffer.from('processed');

    return Promise.resolve({
      buffer,
      mimeType: 'image/webp',
      extension: '.webp',
      sizeBytes: buffer.length,
      sha256: 'a'.repeat(64),
      width: 640,
      height: 480,
    });
  }
}

class FakeImageStagingStorage implements ImageStagingStorage {
  deletedPath: string | null = null;

  /**
   * Simula la escritura temporal.
   */
  save(stagingId: string): Promise<StoredImageFile> {
    return Promise.resolve({
      internalName: `${stagingId}.webp`,
      relativePath: `staging/draft-images/${stagingId}.webp`,
    });
  }

  /**
   * Registra el archivo temporal eliminado.
   */
  delete(relativePath: string): Promise<void> {
    this.deletedPath = relativePath;

    return Promise.resolve();
  }
}

class FakeAssetUrlBuilder implements AssetUrlBuilder {
  /**
   * Genera una URL segura de test.
   */
  build(relativePath: string | null): string | null {
    return relativePath === null ? null : `test://${relativePath}`;
  }
}

describe('ImageStagingService', (): void => {
  it('procesa y registra una imagen temporal', async (): Promise<void> => {
    const service = new ImageStagingService(
      new FakeImageProcessor(),
      new FakeImageStagingStorage(),
      new FakeAssetUrlBuilder(),
    );

    const result: StagedImageInterface = await service.stage({
      purpose: 'article_image',
      originalName: 'foto.jpg',
      buffer: Buffer.from('original'),
    });

    expect(result).toMatchObject({
      purpose: 'article_image',
      originalName: 'foto.jpg',
      mimeType: 'image/webp',
      sizeBytes: Buffer.from('processed').length,
      width: 640,
      height: 480,
    });

    expect(result.stagingId).not.toBe('');
    expect(result.url).toMatch(/^test:\/\/staging\/draft-images\/.+\.webp$/);

    const record: StagedImageRecord | null = service.getRecord(result.stagingId);

    expect(record).toMatchObject({
      stagingId: result.stagingId,
      purpose: 'article_image',
      originalName: 'foto.jpg',
      sha256: 'a'.repeat(64),
    });
  });

  it('descarta el fichero y el record temporal', async (): Promise<void> => {
    const storage = new FakeImageStagingStorage();

    const service = new ImageStagingService(
      new FakeImageProcessor(),
      storage,
      new FakeAssetUrlBuilder(),
    );

    const staged: StagedImageInterface = await service.stage({
      purpose: 'article_image',
      originalName: 'foto.png',
      buffer: Buffer.from('original'),
    });

    await service.discard(staged.stagingId);

    expect(storage.deletedPath).toBe(`staging/draft-images/${staged.stagingId}.webp`);

    expect(service.getRecord(staged.stagingId)).toBeNull();
  });

  it('ignora de forma idempotente un staging inexistente', async (): Promise<void> => {
    const storage = new FakeImageStagingStorage();

    const service = new ImageStagingService(
      new FakeImageProcessor(),
      storage,
      new FakeAssetUrlBuilder(),
    );

    await service.discard('does-not-exist');

    expect(storage.deletedPath).toBeNull();
  });
});
