import type ImageAssetPromoter from '@backend/contracts/files/image-asset-promoter.interface';
import type StagedImageRegistry from '@backend/contracts/files/staged-image-registry.interface';
import type ImageFileStorage from '@backend/contracts/system/image-file-storage.interface';
import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import type ImageStagingStorage from '@backend/contracts/system/image-staging-storage.interface';
import type { ArchivoCreateRecord } from '@backend/domain/files/archivo-record.interface';
import type {
  ImageAssetPurpose,
  StoredImageFile,
} from '@backend/domain/files/image-asset.interface';
import type PreparedImageAsset from '@backend/domain/files/prepared-image-asset.interface';
import type StagedImageRecord from '@backend/domain/files/staged-image-record.interface';
import { createHash, randomUUID } from 'node:crypto';

/**
 * Prepara imágenes de staging para su persistencia definitiva
 * sin modificar todavía SQLite ni consumir el staging original.
 */
export default class ImageAssetPromotionService implements ImageAssetPromoter {
  /**
   * Crea el servicio común de promoción de imágenes.
   */
  constructor(
    private readonly stagedImageRegistry: StagedImageRegistry,
    private readonly imageStagingStorage: ImageStagingStorage,
    private readonly imageFileStorage: ImageFileStorage,
  ) {}

  /**
   * Copia una imagen staged al almacenamiento definitivo
   * y devuelve los metadatos que deberán persistirse en SQLite.
   */
  async prepare(
    stagingId: string,
    expectedPurpose: ImageAssetPurpose,
  ): Promise<PreparedImageAsset> {
    const record: StagedImageRecord | null = this.stagedImageRegistry.getRecord(stagingId);

    if (record === null) {
      throw new Error('La imagen temporal indicada no existe.');
    }

    if (record.purpose !== expectedPurpose) {
      throw new Error('La imagen temporal no pertenece al tipo de recurso esperado.');
    }

    const buffer: Buffer = await this.imageStagingStorage.read(record.relativePath);

    this.assertIntegrity(record, buffer);

    const processedImage: ProcessedImage = {
      buffer,
      mimeType: record.mimeType,
      extension: '.webp',
      sizeBytes: record.sizeBytes,
      sha256: record.sha256,
      width: record.width,
      height: record.height,
    };

    const publicId: string = randomUUID();

    const storedFile: StoredImageFile = await this.imageFileStorage.save(
      record.purpose,
      publicId,
      processedImage,
    );

    const archivo: ArchivoCreateRecord = {
      publicId,
      purpose: record.purpose,
      originalName: record.originalName,
      internalName: storedFile.internalName,
      relativePath: storedFile.relativePath,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      sha256: record.sha256,
      width: record.width,
      height: record.height,
    };

    return {
      stagingId,
      archivo,
    };
  }

  /**
   * Elimina una copia definitiva preparada cuando
   * la operación SQLite que debía consumirla ha fallado.
   */
  async rollback(prepared: PreparedImageAsset): Promise<void> {
    await this.imageFileStorage.delete(prepared.archivo.relativePath);
  }

  /**
   * Comprueba que el WebP staged no haya cambiado
   * desde que fue procesado.
   */
  private assertIntegrity(record: StagedImageRecord, buffer: Buffer): void {
    if (buffer.length !== record.sizeBytes) {
      throw new Error('La imagen temporal no coincide con los metadatos registrados.');
    }

    const sha256: string = createHash('sha256').update(buffer).digest('hex');

    if (sha256 !== record.sha256) {
      throw new Error('La imagen temporal no coincide con los metadatos registrados.');
    }
  }
}
