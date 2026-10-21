import type ImageFileStorage from '@backend/contracts/system/image-file-storage.interface';
import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import IMAGE_ASSET_DIRECTORY_BY_PURPOSE from '@backend/domain/files/image-asset.constants';
import type {
  ImageAssetPurpose,
  StoredImageFile,
} from '@backend/domain/files/image-asset.interface';
import hasFileSystemErrorCode from '@infrastructure/filesystem/filesystem-error.utils';
import { mkdir, rename, rm, writeFile } from 'node:fs/promises';
import { isAbsolute, join, relative, resolve } from 'node:path';

const FILES_RELATIVE_PREFIX: string = 'files/';

type RemoveFile = (
  filePath: string,
  options: {
    readonly force: boolean;
  },
) => Promise<void>;

type RenameFile = (oldPath: string, newPath: string) => Promise<void>;

/**
 * Gestiona las imágenes definitivas almacenadas
 * dentro del directorio de archivos de la aplicación.
 */
export default class FilesystemImageFileStorage implements ImageFileStorage {
  /**
   * Crea el storage sobre el directorio físico de archivos.
   */
  constructor(
    private readonly filesDirectory: string,
    private readonly removeFile: RemoveFile = rm,
    private readonly renameFile: RenameFile = rename,
  ) {}

  /**
   * Guarda atómicamente un WebP en la carpeta de su purpose.
   */
  async save(
    purpose: ImageAssetPurpose,
    publicId: string,
    image: ProcessedImage,
  ): Promise<StoredImageFile> {
    this.assertSafePublicId(publicId);

    const directoryName: string = IMAGE_ASSET_DIRECTORY_BY_PURPOSE[purpose];
    const destinationDirectory: string = join(this.filesDirectory, directoryName);

    await mkdir(destinationDirectory, {
      recursive: true,
    });

    const internalName: string = `${publicId}${image.extension}`;
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
       * Si writeFile devuelve EEXIST, el archivo temporal
       * ya existía antes de esta operación.
       * No debemos eliminar un archivo ajeno.
       */
      if (!temporaryFileCreated && hasFileSystemErrorCode(error, 'EEXIST')) {
        throw error;
      }

      /*
       * En el resto de errores intentamos limpiar
       * el temporal para no dejar archivos residuales.
       */
      try {
        await this.removeFile(temporaryPath, {
          force: true,
        });
      } catch (cleanupError: unknown) {
        throw new AggregateError(
          [error, cleanupError],
          'No se ha podido guardar la imagen definitiva ni limpiar su archivo provisional.',
          {
            cause: cleanupError,
          },
        );
      }

      throw error;
    }

    return {
      internalName,
      relativePath: ['files', directoryName, internalName].join('/'),
    };
  }

  /**
   * Elimina un archivo comprobando que pertenezca al storage.
   */
  async delete(relativePath: string): Promise<void> {
    const absolutePath: string = this.resolveManagedPath(relativePath);

    await this.removeFile(absolutePath, {
      force: true,
    });
  }

  /**
   * Evita utilizar un publicId como componente arbitrario de ruta.
   */
  private assertSafePublicId(publicId: string): void {
    if (publicId.length === 0 || !/^[A-Za-z0-9_-]+$/.test(publicId)) {
      throw new Error('El identificador público del archivo no es válido.');
    }
  }

  /**
   * Resuelve una ruta relativa evitando escapes fuera del storage.
   */
  private resolveManagedPath(relativePath: string): string {
    const normalizedPath: string = relativePath.replaceAll('\\', '/').replace(/^\/+/, '');

    if (!normalizedPath.startsWith(FILES_RELATIVE_PREFIX)) {
      throw new Error('La ruta no pertenece al almacenamiento de archivos.');
    }

    const managedRelativePath: string = normalizedPath.slice(FILES_RELATIVE_PREFIX.length);
    const rootPath: string = resolve(this.filesDirectory);
    const absolutePath: string = resolve(rootPath, managedRelativePath);
    const relativeToRoot: string = relative(rootPath, absolutePath);

    if (
      relativeToRoot.length === 0 ||
      relativeToRoot.startsWith('..') ||
      isAbsolute(relativeToRoot)
    ) {
      throw new Error('La ruta del archivo no es válida.');
    }

    return absolutePath;
  }
}
