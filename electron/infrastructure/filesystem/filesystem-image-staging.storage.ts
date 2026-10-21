import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import type ImageStagingStorage from '@backend/contracts/system/image-staging-storage.interface';
import type { StoredImageFile } from '@backend/domain/files/image-asset.interface';
import hasFileSystemErrorCode from '@infrastructure/filesystem/filesystem-error.utils';
import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

const DRAFT_IMAGES_DIRECTORY: string = 'draft-images';
const STAGING_RELATIVE_PREFIX: string = 'staging/draft-images/';

type RemoveFile = (
  filePath: string,
  options: {
    readonly force: boolean;
  },
) => Promise<void>;

type RenameFile = (oldPath: string, newPath: string) => Promise<void>;

/**
 * Gestiona las imágenes temporales pertenecientes
 * a drafts todavía no persistidos.
 */
export default class FilesystemImageStagingStorage implements ImageStagingStorage {
  /**
   * Crea el storage sobre staging/files.
   */
  constructor(
    private readonly stagingFilesDirectory: string,
    private readonly removeFile: RemoveFile = rm,
    private readonly renameFile: RenameFile = rename,
  ) {}

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

    let temporaryFileCreated: boolean = false;

    try {
      await writeFile(temporaryPath, image.buffer, {
        mode: 0o600,
        flag: 'wx',
      });

      temporaryFileCreated = true;

      await this.renameFile(temporaryPath, destinationPath);
    } catch (error: unknown) {
      /*
       * Si writeFile devuelve EEXIST, el temporal
       * ya pertenecía a otra operación.
       * No debemos eliminarlo.
       */
      if (!temporaryFileCreated && hasFileSystemErrorCode(error, 'EEXIST')) {
        throw error;
      }

      /*
       * Ante otros errores intentamos limpiar
       * el archivo provisional, conservando
       * siempre el error original.
       */
      try {
        await this.removeFile(temporaryPath, {
          force: true,
        });
      } catch (cleanupError: unknown) {
        throw new AggregateError(
          [error, cleanupError],
          'No se ha podido guardar la imagen temporal ni limpiar su archivo provisional.',
          {
            cause: cleanupError,
          },
        );
      }

      throw error;
    }

    return {
      internalName,
      relativePath: ['staging', DRAFT_IMAGES_DIRECTORY, internalName].join('/'),
    };
  }

  /**
   * Lee una imagen perteneciente al staging de drafts.
   */
  async read(relativePath: string): Promise<Buffer> {
    const absolutePath: string = this.resolveManagedPath(relativePath);

    return readFile(absolutePath);
  }

  /**
   * Elimina una imagen perteneciente al staging de drafts.
   */
  async delete(relativePath: string): Promise<void> {
    const absolutePath: string = this.resolveManagedPath(relativePath);

    await this.removeFile(absolutePath, {
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
