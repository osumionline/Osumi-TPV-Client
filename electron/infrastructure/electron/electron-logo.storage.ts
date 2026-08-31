import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type {
  ImageProcessor,
  ProcessedImage,
} from '@backend/contracts/system/image-processor.interface';
import type { InstallationLogoData } from '@desktop-contracts/configuration/installation-command.interface';
import { access, rename, rm, writeFile } from 'node:fs/promises';

const MAX_LOGO_FILE_SIZE: number = 5 * 1024 * 1024;
const MAX_LOGO_DIMENSION: number = 4096;

/**
 * Persiste el logo de la aplicación en formato WebP.
 */
export default class ElectronLogoStorage implements LogoStorage {
  /**
   * Crea el storage sobre la ruta física definitiva o temporal.
   */
  constructor(
    private readonly filePath: string,
    private readonly imageProcessor: ImageProcessor,
  ) {}

  /**
   * Comprueba si existe un logo persistido.
   */
  async exists(): Promise<boolean> {
    try {
      await access(this.filePath);

      return true;
    } catch {
      return false;
    }
  }

  /**
   * Valida el logo recibido, lo convierte a WebP y lo guarda atómicamente.
   */
  async save(logo: InstallationLogoData): Promise<void> {
    const originalBuffer: Buffer = this.decodeDataUrl(logo.dataUrl);

    if (originalBuffer.length > MAX_LOGO_FILE_SIZE) {
      throw new Error('El logo no puede superar los 5 MB.');
    }

    const processedImage: ProcessedImage = await this.imageProcessor.convertToWebp(originalBuffer);

    if (processedImage.width > MAX_LOGO_DIMENSION || processedImage.height > MAX_LOGO_DIMENSION) {
      throw new Error('El logo no puede superar 4096 píxeles de ancho o alto.');
    }

    const temporaryFilePath: string = `${this.filePath}.tmp`;

    try {
      await writeFile(temporaryFilePath, processedImage.buffer, {
        mode: 0o600,
      });

      await rename(temporaryFilePath, this.filePath);
    } catch (error: unknown) {
      await rm(temporaryFilePath, {
        force: true,
      });

      throw error;
    }
  }

  /**
   * Elimina el logo persistido.
   */
  async delete(): Promise<void> {
    await rm(this.filePath, {
      force: true,
    });
  }

  /**
   * Extrae y valida el contenido Base64 de un Data URL.
   */
  private decodeDataUrl(dataUrl: string): Buffer {
    const separatorPosition: number = dataUrl.indexOf(',');

    if (separatorPosition === -1) {
      throw new Error('El Data URL del logo no es válido.');
    }

    const encodedData: string = dataUrl.slice(separatorPosition + 1);

    if (encodedData.length === 0 || !/^[A-Za-z0-9+/]*={0,2}$/.test(encodedData)) {
      throw new Error('El contenido Base64 del logo no es válido.');
    }

    return Buffer.from(encodedData, 'base64');
  }
}
