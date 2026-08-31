import type {
  ImageProcessor,
  ProcessedImage,
} from '@backend/contracts/system/image-processor.interface';
import { createHash } from 'node:crypto';
import sharp, { type Metadata, type OutputInfo } from 'sharp';

const MAXIMUM_INPUT_SIZE_BYTES: number = 50 * 1024 * 1024;
const MAXIMUM_INPUT_PIXELS: number = 100_000_000;
const WEBP_QUALITY: number = 85;
const WEBP_EFFORT: number = 4;

const SUPPORTED_IMAGE_FORMATS: ReadonlySet<string> = new Set<string>(['jpeg', 'png', 'webp']);

/**
 * Convierte las imágenes de usuario al WebP canónico
 * utilizado por los assets de Osumi TPV.
 */
export default class SharpImageProcessor implements ImageProcessor {
  /**
   * Valida una imagen y genera una versión WebP
   * conservando sus dimensiones originales.
   */
  async convertToWebp(input: Buffer): Promise<ProcessedImage> {
    this.assertInputSize(input);

    const metadata: Metadata = await this.readMetadata(input);

    this.assertSupportedFormat(metadata);
    this.assertStaticImage(metadata);

    const result: {
      readonly data: Buffer;
      readonly info: OutputInfo;
    } = await this.convert(input);

    if (result.info.width <= 0 || result.info.height <= 0) {
      throw new Error('La imagen procesada tiene dimensiones no válidas.');
    }

    return {
      buffer: result.data,
      mimeType: 'image/webp',
      extension: '.webp',
      sizeBytes: result.data.length,
      sha256: createHash('sha256').update(result.data).digest('hex'),
      width: result.info.width,
      height: result.info.height,
    };
  }

  /**
   * Impide procesar entradas excesivamente grandes.
   */
  private assertInputSize(input: Buffer): void {
    if (input.length === 0) {
      throw new Error('La imagen recibida está vacía.');
    }

    if (input.length > MAXIMUM_INPUT_SIZE_BYTES) {
      throw new Error('La imagen no puede superar los 50 MB.');
    }
  }

  /**
   * Lee de forma segura los metadatos de la imagen.
   */
  private async readMetadata(input: Buffer): Promise<Metadata> {
    try {
      return await sharp(input, {
        failOn: 'error',
        limitInputPixels: MAXIMUM_INPUT_PIXELS,
      }).metadata();
    } catch (error: unknown) {
      throw new Error('El archivo recibido no contiene una imagen válida.', {
        cause: error,
      });
    }
  }

  /**
   * Limita las entradas a los formatos de fotografía
   * que soportamos actualmente.
   */
  private assertSupportedFormat(metadata: Metadata): void {
    if (metadata.format === undefined || !SUPPORTED_IMAGE_FORMATS.has(metadata.format)) {
      throw new Error('El formato de imagen no está soportado. Usa JPEG, PNG o WebP.');
    }
  }

  /**
   * Evita perder silenciosamente animaciones al convertirlas.
   */
  private assertStaticImage(metadata: Metadata): void {
    if (metadata.pages !== undefined && metadata.pages > 1) {
      throw new Error('Las imágenes animadas no están soportadas.');
    }
  }

  /**
   * Normaliza orientación y genera el WebP definitivo.
   */
  private async convert(input: Buffer): Promise<{
    readonly data: Buffer;
    readonly info: OutputInfo;
  }> {
    try {
      return await sharp(input, {
        failOn: 'error',
        limitInputPixels: MAXIMUM_INPUT_PIXELS,
      })
        .rotate()
        .webp({
          quality: WEBP_QUALITY,
          effort: WEBP_EFFORT,
        })
        .toBuffer({
          resolveWithObject: true,
        });
    } catch (error: unknown) {
      throw new Error('No se ha podido convertir la imagen a WebP.', {
        cause: error,
      });
    }
  }
}
