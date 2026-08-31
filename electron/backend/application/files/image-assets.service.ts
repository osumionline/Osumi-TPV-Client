import type CreateImageAssetCommand from '@backend/application/files/create-image-asset-command.interface';
import type ArchivosRepository from '@backend/contracts/files/archivos.repository.interface';
import type ImageFileStorage from '@backend/contracts/system/image-file-storage.interface';
import type {
  ImageProcessor,
  ProcessedImage,
} from '@backend/contracts/system/image-processor.interface';
import type {
  ArchivoCreateRecord,
  ArchivoRecord,
} from '@backend/domain/files/archivo-record.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';
import { randomUUID } from 'node:crypto';

/**
 * Coordina procesamiento, almacenamiento físico
 * y registro SQLite de imágenes persistentes.
 */
export default class ImageAssetsService {
  /**
   * Crea el servicio común de imágenes.
   */
  constructor(
    private readonly imageProcessor: ImageProcessor,
    private readonly imageFileStorage: ImageFileStorage,
    private readonly archivosRepository: ArchivosRepository,
  ) {}

  /**
   * Convierte una imagen a WebP, la guarda
   * y registra sus metadatos en SQLite.
   */
  async create(command: CreateImageAssetCommand): Promise<ArchivoRecord> {
    const processedImage: ProcessedImage = await this.imageProcessor.convertToWebp(command.buffer);
    const publicId: string = randomUUID();
    const storedFile: StoredImageFile = await this.imageFileStorage.save(
      command.purpose,
      publicId,
      processedImage,
    );

    const archivoCommand: ArchivoCreateRecord = {
      publicId,
      purpose: command.purpose,
      originalName: command.originalName,
      internalName: storedFile.internalName,
      relativePath: storedFile.relativePath,
      mimeType: processedImage.mimeType,
      sizeBytes: processedImage.sizeBytes,
      sha256: processedImage.sha256,
      width: processedImage.width,
      height: processedImage.height,
    };

    try {
      return await this.archivosRepository.create(archivoCommand);
    } catch (error: unknown) {
      await this.rollbackStoredFile(storedFile.relativePath, error);
      throw error;
    }
  }

  /**
   * Compensa el fichero escrito cuando falla el registro SQLite.
   */
  private async rollbackStoredFile(relativePath: string, originalError: unknown): Promise<void> {
    try {
      await this.imageFileStorage.delete(relativePath);
    } catch (cleanupError: unknown) {
      throw new AggregateError(
        [originalError, cleanupError],
        'No se ha podido registrar la imagen ni limpiar el archivo físico.',
        {
          cause: cleanupError,
        },
      );
    }
  }
}
