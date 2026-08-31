import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import type ImageStagingStorage from '@backend/contracts/system/image-staging-storage.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

const DRAFT_IMAGES_DIRECTORY: string = 'draft-images';
const STAGING_RELATIVE_PREFIX: string = 'staging/draft-images/';

/**
 * Gestiona las imágenes temporales pertenecientes
 * a drafts todavía no persistidos.
 */
export default class FilesystemImageStagingStorage implements ImageStagingStorage {
  /**
   * Crea el storage sobre staging/files.
   */
  constructor(private readonly stagingFilesDirectory: string) {}

  /**
   * Guarda atómicamente un WebP temporal.
   */
  async save(stagingId: string, image: ProcessedImage): Promise<StoredImageFile> {
    this.assertSafeStagingId(stagingId);

    const destinationDirectory: string = join(this.stagingFilesDirectory, DRAFT_IMAGES_DIRECTORY);

    await mkdir(destinationDirectory, {
      recursive: true,
    });

    const internalName: string = `${stagingId}${image.extension}`;
    const destinationPath: string = join(destinationDirectory, internalName);
    const temporaryPath: string = `${destinationPath}.tmp`;

    try {
      await writeFile(temporaryPath, image.buffer, {
        mode: 0o600,
        flag: 'wx',
      });

      await rename(temporaryPath, destinationPath);
    } catch (error: unknown) {
      await rm(temporaryPath, {
        force: true,
      });

      throw error;
    }

    return {
      internalName,
      relativePath: ['staging', DRAFT_IMAGES_DIRECTORY, internalName].join('/'),
    };
  }

  /**
   * Elimina una imagen perteneciente al staging de drafts.
   */
  async delete(relativePath: string): Promise<void> {
    const absolutePath: string = this.resolveManagedPath(relativePath);

    await rm(absolutePath, {
      force: true,
    });
  }

  /**
   * Valida el identificador utilizado como nombre físico.
   */
  private assertSafeStagingId(stagingId: string): void {
    if (stagingId.length === 0 || !/^[A-Za-z0-9_-]+$/.test(stagingId)) {
      throw new Error('El identificador temporal de la imagen no es válido.');
    }
  }

  /**
   * Resuelve una ruta temporal evitando escapes del storage.
   */
  private resolveManagedPath(relativePath: string): string {
    const normalizedPath: string = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');

    if (!normalizedPath.startsWith(STAGING_RELATIVE_PREFIX)) {
      throw new Error('La ruta no pertenece al staging de imágenes.');
    }

    const managedRelativePath: string = normalizedPath.slice('staging/'.length);

    const rootPath: string = resolve(this.stagingFilesDirectory);
    const absolutePath: string = resolve(rootPath, managedRelativePath);
    const relativeToRoot: string = relative(rootPath, absolutePath);

    if (
      relativeToRoot.length === 0 ||
      relativeToRoot.startsWith('..') ||
      isAbsolute(relativeToRoot)
    ) {
      throw new Error('La ruta temporal de la imagen no es válida.');
    }

    return absolutePath;
  }
}
