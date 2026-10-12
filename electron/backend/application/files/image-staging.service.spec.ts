import ImageStagingService from '@backend/application/files/image-staging.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type {
  ImageProcessor,
  ProcessedImage,
} from '@backend/contracts/system/image-processor.interface';
import type ImageStagingStorage from '@backend/contracts/system/image-staging-storage.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';
import type StagedImageRecord from '@backend/domain/files/staged-image-record.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import { beforeEach, describe, expect, it } from 'vitest';

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
  savedPath: string | null = null;
  saveError: Error | null = null;
  deleteError: Error | null = null;

  /**
   * Simula la escritura temporal.
   */
  save(stagingId: string): Promise<StoredImageFile> {
    if (this.saveError !== null) {
      return Promise.reject(this.saveError);
    }

    this.savedPath = `staging/draft-images/${stagingId}.webp`;

    return Promise.resolve({
      internalName: `${stagingId}.webp`,
      relativePath: this.savedPath,
    });
  }

  /**
   * Simula la lectura de una imagen temporal.
   */
  read(): Promise<Buffer> {
    return Promise.resolve(Buffer.from('processed'));
  }

  /**
   * Registra el archivo temporal eliminado.
   */
  delete(relativePath: string): Promise<void> {
    if (this.deleteError !== null) {
      return Promise.reject(this.deleteError);
    }

    this.deletedPath = relativePath;

    return Promise.resolve();
  }
}

class FakeAssetUrlBuilder implements AssetUrlBuilder {
  error: Error | null = null;

  /**
   * Genera una URL segura de test.
   */
  build(relativePath: string | null): string | null {
    if (this.error !== null) {
      throw this.error;
    }

    return relativePath === null ? null : `test://${relativePath}`;
  }
}

let applicationLogger: TestApplicationLogger;

describe('ImageStagingService', (): void => {
  beforeEach((): void => {
    applicationLogger = new TestApplicationLogger();
  });

  it('procesa y registra una imagen temporal', async (): Promise<void> => {
    const service = new ImageStagingService(
      new FakeImageProcessor(),
      new FakeImageStagingStorage(),
      new FakeAssetUrlBuilder(),
      applicationLogger,
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

  it('procesa un logo de Marca conservando su purpose', async (): Promise<void> => {
    const service = new ImageStagingService(
      new FakeImageProcessor(),
      new FakeImageStagingStorage(),
      new FakeAssetUrlBuilder(),
      applicationLogger,
    );

    const result: StagedImageInterface = await service.stage({
      purpose: 'brand_image',
      originalName: 'logo-marca.png',
      buffer: Buffer.from('original'),
    });

    expect(result).toMatchObject({
      purpose: 'brand_image',
      originalName: 'logo-marca.png',
      mimeType: 'image/webp',
      width: 640,
      height: 480,
    });

    const record: StagedImageRecord | null = service.getRecord(result.stagingId);

    expect(record).toMatchObject({
      stagingId: result.stagingId,
      purpose: 'brand_image',
      originalName: 'logo-marca.png',
      sha256: 'a'.repeat(64),
    });
  });

  it('procesa un logo de Proveedor conservando su purpose', async (): Promise<void> => {
    const service = new ImageStagingService(
      new FakeImageProcessor(),
      new FakeImageStagingStorage(),
      new FakeAssetUrlBuilder(),
      applicationLogger,
    );

    const result: StagedImageInterface = await service.stage({
      purpose: 'provider_image',
      originalName: 'logo-proveedor.png',
      buffer: Buffer.from('original'),
    });

    expect(result).toMatchObject({
      purpose: 'provider_image',
      originalName: 'logo-proveedor.png',
      mimeType: 'image/webp',
      width: 640,
      height: 480,
    });

    const record: StagedImageRecord | null = service.getRecord(result.stagingId);

    expect(record).toMatchObject({
      stagingId: result.stagingId,
      purpose: 'provider_image',
      originalName: 'logo-proveedor.png',
      sha256: 'a'.repeat(64),
    });
  });

  it('descarta el fichero y el record temporal', async (): Promise<void> => {
    const storage = new FakeImageStagingStorage();

    const service = new ImageStagingService(
      new FakeImageProcessor(),
      storage,
      new FakeAssetUrlBuilder(),
      applicationLogger,
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
      applicationLogger,
    );

    await service.discard('does-not-exist');

    expect(storage.deletedPath).toBeNull();
  });

  it('registra un fallo técnico al guardar una imagen temporal', async (): Promise<void> => {
    const storage = new FakeImageStagingStorage();
    const error: Error = new Error('No se puede escribir en staging.');

    storage.saveError = error;

    const service = new ImageStagingService(
      new FakeImageProcessor(),
      storage,
      new FakeAssetUrlBuilder(),
      applicationLogger,
    );

    await expect(
      service.stage({
        purpose: 'article_image',
        originalName: 'foto.jpg',
        buffer: Buffer.from('original'),
      }),
    ).rejects.toBe(error);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'files',
        operation: 'stage-image',
        message: 'No se ha podido preparar una imagen temporal.',
        error,
        context: {
          purpose: 'article_image',
        },
      },
    ]);
  });

  it('registra un fallo al descartar una imagen temporal y conserva su record', async (): Promise<void> => {
    const storage = new FakeImageStagingStorage();

    const service = new ImageStagingService(
      new FakeImageProcessor(),
      storage,
      new FakeAssetUrlBuilder(),
      applicationLogger,
    );

    const staged: StagedImageInterface = await service.stage({
      purpose: 'article_image',
      originalName: 'foto.jpg',
      buffer: Buffer.from('original'),
    });

    const error: Error = new Error('No se puede eliminar el staging.');

    storage.deleteError = error;

    await expect(service.discard(staged.stagingId)).rejects.toBe(error);

    expect(service.getRecord(staged.stagingId)).not.toBeNull();

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'files',
        operation: 'discard-staged-image',
        message: 'No se ha podido eliminar una imagen temporal del staging.',
        error,
        context: {
          purpose: 'article_image',
        },
      },
    ]);
  });

  it('limpia el fichero staged cuando falla la construcción de su URL', async (): Promise<void> => {
    const storage = new FakeImageStagingStorage();
    const assetUrlBuilder = new FakeAssetUrlBuilder();
    const error: Error = new Error('No se ha podido construir la URL.');

    assetUrlBuilder.error = error;

    const service = new ImageStagingService(
      new FakeImageProcessor(),
      storage,
      assetUrlBuilder,
      applicationLogger,
    );

    await expect(
      service.stage({
        purpose: 'article_image',
        originalName: 'foto.jpg',
        buffer: Buffer.from('original'),
      }),
    ).rejects.toBe(error);

    expect(storage.deletedPath).toBe(storage.savedPath);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'files',
        operation: 'stage-image',
        message: 'No se ha podido preparar una imagen temporal.',
        error,
        context: {
          purpose: 'article_image',
        },
      },
    ]);
  });
});

/**
 * Logger controlado utilizado por las pruebas.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];
  readonly errorEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva avisos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Conserva errores.
   */
  error(event: ApplicationLogEvent): void {
    this.errorEvents.push(event);
  }

  /**
   * No mantiene escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}
