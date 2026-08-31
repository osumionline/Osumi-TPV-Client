import ImageAssetPromotionService from '@backend/application/files/image-asset-promotion.service';
import type StagedImageRegistry from '@backend/contracts/files/staged-image-registry.interface';
import type ImageFileStorage from '@backend/contracts/system/image-file-storage.interface';
import type ImageStagingStorage from '@backend/contracts/system/image-staging-storage.interface';
import type {
  ImageAssetPurpose,
  StoredImageFile,
} from '@backend/domain/files/image-asset.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type StagedImageRecord from '@backend/domain/files/staged-image-record.interface';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';

const STAGED_BUFFER: Buffer = Buffer.from('staged-webp');

const STAGED_SHA256: string = createHash('sha256').update(STAGED_BUFFER).digest('hex');

class FakeStagedImageRegistry implements StagedImageRegistry {
  record: StagedImageRecord | null = createStagedImageRecord();

  /**
   * Devuelve el record temporal configurado.
   */
  getRecord(stagingId: string): StagedImageRecord | null {
    return this.record?.stagingId === stagingId ? this.record : null;
  }
}

class FakeImageStagingStorage implements ImageStagingStorage {
  buffer: Buffer = STAGED_BUFFER;

  /**
   * No se utiliza durante estos tests.
   */
  save(): Promise<StoredImageFile> {
    throw new Error('Operación no esperada en el test.');
  }

  /**
   * Devuelve el contenido staged configurado.
   */
  read(): Promise<Buffer> {
    return Promise.resolve(this.buffer);
  }

  /**
   * No se utiliza durante estos tests.
   */
  delete(): Promise<void> {
    return Promise.resolve();
  }
}

class FakeImageFileStorage implements ImageFileStorage {
  deletedPath: string | null = null;

  /**
   * Simula el guardado definitivo.
   */
  save(purpose: ImageAssetPurpose, publicId: string): Promise<StoredImageFile> {
    const directory: string = purpose === 'article_image' ? 'articles' : 'other';

    return Promise.resolve({
      internalName: `${publicId}.webp`,
      relativePath: `files/${directory}/${publicId}.webp`,
    });
  }

  /**
   * Registra la copia definitiva eliminada.
   */
  delete(relativePath: string): Promise<void> {
    this.deletedPath = relativePath;

    return Promise.resolve();
  }
}

describe('ImageAssetPromotionService', (): void => {
  it('prepara una imagen staged para persistencia definitiva', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();
    const stagingStorage = new FakeImageStagingStorage();
    const fileStorage = new FakeImageFileStorage();

    const service = new ImageAssetPromotionService(stagingRegistry, stagingStorage, fileStorage);

    const result: PreparedImageAsset = await service.prepare('staging-id', 'article_image');

    expect(result.stagingId).toBe('staging-id');

    expect(result.archivo).toMatchObject({
      purpose: 'article_image',
      originalName: 'photo.jpg',
      mimeType: 'image/webp',
      sizeBytes: STAGED_BUFFER.length,
      sha256: STAGED_SHA256,
      width: 800,
      height: 600,
    });

    expect(result.archivo.relativePath).toMatch(/^files\/articles\/.+\.webp$/);
  });

  it('rechaza un staging inexistente', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();

    stagingRegistry.record = null;

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      new FakeImageStagingStorage(),
      new FakeImageFileStorage(),
    );

    await expect(service.prepare('missing', 'article_image')).rejects.toThrow(
      'La imagen temporal indicada no existe.',
    );
  });

  it('rechaza una imagen de otro purpose', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();

    stagingRegistry.record = {
      ...createStagedImageRecord(),
      purpose: 'brand_image',
    };

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      new FakeImageStagingStorage(),
      new FakeImageFileStorage(),
    );

    await expect(service.prepare('staging-id', 'article_image')).rejects.toThrow(
      'La imagen temporal no pertenece al tipo de recurso esperado.',
    );
  });

  it('rechaza un fichero staged que haya cambiado', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();
    const stagingStorage = new FakeImageStagingStorage();

    stagingStorage.buffer = Buffer.from('tampered');

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      stagingStorage,
      new FakeImageFileStorage(),
    );

    await expect(service.prepare('staging-id', 'article_image')).rejects.toThrow(
      'La imagen temporal no coincide con los metadatos registrados.',
    );
  });

  it('elimina la copia definitiva al hacer rollback', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();
    const fileStorage = new FakeImageFileStorage();

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      new FakeImageStagingStorage(),
      fileStorage,
    );

    const prepared: PreparedImageAsset = await service.prepare('staging-id', 'article_image');

    await service.rollback(prepared);

    expect(fileStorage.deletedPath).toBe(prepared.archivo.relativePath);
  });
});

/**
 * Crea el record temporal utilizado por los tests.
 */
function createStagedImageRecord(): StagedImageRecord {
  return {
    stagingId: 'staging-id',
    purpose: 'article_image',
    originalName: 'photo.jpg',
    relativePath: 'staging/draft-images/staging-id.webp',
    mimeType: 'image/webp',
    sizeBytes: STAGED_BUFFER.length,
    sha256: STAGED_SHA256,
    width: 800,
    height: 600,
  };
}
