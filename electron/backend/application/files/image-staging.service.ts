import type StageImageCommand from '@backend/application/files/stage-image-command.interface';
import type StagedImageRegistry from '@backend/contracts/files/staged-image-registry.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type {
  ImageProcessor,
  ProcessedImage,
} from '@backend/contracts/system/image-processor.interface';
import type ImageStagingStorage from '@backend/contracts/system/image-staging-storage.interface';
import type StagedImageRecord from '@backend/domain/files/staged-image-record.interface';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import { randomUUID } from 'node:crypto';

/**
 * Gestiona las imágenes temporales de drafts
 * durante la ejecución actual de la aplicación.
 */
export default class ImageStagingService implements StagedImageRegistry {
  private readonly records: Map<string, StagedImageRecord> = new Map<string, StagedImageRecord>();

  /**
   * Crea el servicio común de staging.
   */
  constructor(
    private readonly imageProcessor: ImageProcessor,
    private readonly imageStagingStorage: ImageStagingStorage,
    private readonly assetUrlBuilder: AssetUrlBuilder,
  ) {}

  /**
   * Convierte una imagen a WebP y la conserva temporalmente.
   */
  async stage(command: StageImageCommand): Promise<StagedImageInterface> {
    const processedImage: ProcessedImage = await this.imageProcessor.convertToWebp(command.buffer);

    const stagingId: string = randomUUID();

    const storedFile = await this.imageStagingStorage.save(stagingId, processedImage);

    const record: StagedImageRecord = {
      stagingId,
      purpose: command.purpose,
      originalName: command.originalName,
      relativePath: storedFile.relativePath,
      mimeType: processedImage.mimeType,
      sizeBytes: processedImage.sizeBytes,
      sha256: processedImage.sha256,
      width: processedImage.width,
      height: processedImage.height,
    };

    this.records.set(stagingId, record);

    return this.mapPublic(record);
  }

  /**
   * Elimina una imagen temporal si todavía existe.
   */
  async discard(stagingId: string): Promise<void> {
    const record: StagedImageRecord | undefined = this.records.get(stagingId);

    if (record === undefined) {
      return;
    }

    await this.imageStagingStorage.delete(record.relativePath);

    this.records.delete(stagingId);
  }

  /**
   * Obtiene internamente una imagen temporal registrada.
   */
  getRecord(stagingId: string): StagedImageRecord | null {
    return this.records.get(stagingId) ?? null;
  }

  /**
   * Convierte el record interno en un contrato seguro.
   */
  private mapPublic(record: StagedImageRecord): StagedImageInterface {
    const url: string | null = this.assetUrlBuilder.build(record.relativePath);

    if (url === null) {
      throw new Error('No se ha podido generar la URL temporal de la imagen.');
    }

    return {
      stagingId: record.stagingId,
      purpose: record.purpose,
      originalName: record.originalName,
      url,
      mimeType: record.mimeType,
      sizeBytes: record.sizeBytes,
      width: record.width,
      height: record.height,
    };
  }
}
