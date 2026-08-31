import type ArchivosRepository from '@backend/contracts/files/archivos.repository.interface';
import type ImageFileStorage from '@backend/contracts/system/image-file-storage.interface';
import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import { type ImageProcessor } from '@backend/contracts/system/image-processor.interface';
import type {
  ArchivoCreateRecord,
  ArchivoRecord,
} from '@backend/domain/files/archivo-record.interface';
import type {
  ImageAssetPurpose,
  StoredImageFile,
} from '@backend/domain/files/image-asset.interface';
import { randomUUID } from 'node:crypto';

export interface CreateImageAssetCommand {
  readonly purpose: ImageAssetPurpose;
  readonly originalName: string | null;
  readonly buffer: Buffer;
}

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
      await this.cleanStoredFile(storedFile.relativePath);

      throw error;
    }
  }

  /**
   * Intenta eliminar un fichero escrito cuando
   * su registro SQLite no ha podido crearse.
   */
  private async cleanStoredFile(relativePath: string): Promise<void> {
    try {
      await this.imageFileStorage.delete(relativePath);
    } catch (error: unknown) {
      console.error('No se ha podido limpiar una imagen huérfana:', error);
    }
  }
}
