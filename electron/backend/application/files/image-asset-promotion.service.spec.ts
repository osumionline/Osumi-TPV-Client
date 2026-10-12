import ImageAssetPromotionService from '@backend/application/files/image-asset-promotion.service';
import type StagedImageRegistry from '@backend/contracts/files/staged-image-registry.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type ImageFileStorage from '@backend/contracts/system/image-file-storage.interface';
import type ImageStagingStorage from '@backend/contracts/system/image-staging-storage.interface';
import type {
  ImageAssetPurpose,
  StoredImageFile,
} from '@backend/domain/files/image-asset.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type StagedImageRecord from '@backend/domain/files/staged-image-record.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import { createHash } from 'node:crypto';
import { beforeEach, describe, expect, it } from 'vitest';

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
  readError: Error | null = null;

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
    if (this.readError !== null) {
      return Promise.reject(this.readError);
    }

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
  saveError: Error | null = null;
  deleteError: Error | null = null;

  /**
   * Simula el guardado definitivo.
   */
  save(purpose: ImageAssetPurpose, publicId: string): Promise<StoredImageFile> {
    if (this.saveError !== null) {
      return Promise.reject(this.saveError);
    }

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
    if (this.deleteError !== null) {
      return Promise.reject(this.deleteError);
    }

    this.deletedPath = relativePath;

    return Promise.resolve();
  }
}

let applicationLogger: TestApplicationLogger;

describe('ImageAssetPromotionService', (): void => {
  beforeEach((): void => {
    applicationLogger = new TestApplicationLogger();
  });

  it('prepara una imagen staged para persistencia definitiva', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();
    const stagingStorage = new FakeImageStagingStorage();
    const fileStorage = new FakeImageFileStorage();

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      stagingStorage,
      fileStorage,
      applicationLogger,
    );

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
      applicationLogger,
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
      applicationLogger,
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
      applicationLogger,
    );

    await expect(service.prepare('staging-id', 'article_image')).rejects.toThrow(
      'La imagen temporal no coincide con los metadatos registrados.',
    );
    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'files',
        operation: 'validate-staged-image',
        message: 'La imagen temporal ha perdido su integridad antes de promoverla.',
        error: expect.objectContaining({
          message: 'La imagen temporal no coincide con los metadatos registrados.',
        }),
        context: {
          purpose: 'article_image',
        },
      },
    ]);
  });

  it('elimina la copia definitiva al hacer rollback', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();
    const fileStorage = new FakeImageFileStorage();

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      new FakeImageStagingStorage(),
      fileStorage,
      applicationLogger,
    );

    const prepared: PreparedImageAsset = await service.prepare('staging-id', 'article_image');

    await service.rollback(prepared);

    expect(fileStorage.deletedPath).toBe(prepared.archivo.relativePath);
  });

  it('registra un fallo técnico al leer el staging', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();
    const stagingStorage = new FakeImageStagingStorage();
    const error: Error = new Error('No se puede leer el staging.');

    stagingStorage.readError = error;

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      stagingStorage,
      new FakeImageFileStorage(),
      applicationLogger,
    );

    await expect(service.prepare('staging-id', 'article_image')).rejects.toBe(error);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'files',
        operation: 'read-staged-image',
        message: 'No se ha podido leer una imagen temporal antes de promoverla.',
        error,
        context: {
          purpose: 'article_image',
        },
      },
    ]);
  });

  it('registra un fallo técnico al promover una imagen', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();
    const fileStorage = new FakeImageFileStorage();
    const error: Error = new Error('No se puede guardar la imagen definitiva.');

    fileStorage.saveError = error;

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      new FakeImageStagingStorage(),
      fileStorage,
      applicationLogger,
    );

    await expect(service.prepare('staging-id', 'article_image')).rejects.toBe(error);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'files',
        operation: 'promote-staged-image',
        message: 'No se ha podido copiar una imagen temporal al almacenamiento definitivo.',
        error,
        context: {
          purpose: 'article_image',
        },
      },
    ]);
  });

  it('registra el fallo de rollback de una imagen preparada', async (): Promise<void> => {
    const stagingRegistry = new FakeStagedImageRegistry();
    const fileStorage = new FakeImageFileStorage();

    const service = new ImageAssetPromotionService(
      stagingRegistry,
      new FakeImageStagingStorage(),
      fileStorage,
      applicationLogger,
    );

    const prepared: PreparedImageAsset = await service.prepare('staging-id', 'article_image');

    const error: Error = new Error('No se puede limpiar la imagen preparada.');

    fileStorage.deleteError = error;

    await expect(service.rollback(prepared)).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'files',
        operation: 'rollback-promoted-image',
        message:
          'No se ha podido limpiar una imagen definitiva preparada después de fallar su persistencia.',
        error,
        context: {
          purpose: 'article_image',
        },
      },
    ]);
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
