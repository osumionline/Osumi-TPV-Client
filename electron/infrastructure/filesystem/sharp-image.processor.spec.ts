import type { ProcessedImage } from '@backend/contracts/system/image-processor.interface';
import SharpImageProcessor from '@infrastructure/filesystem/sharp-image.processor';
import { createHash } from 'node:crypto';
import sharp, { type Metadata } from 'sharp';
import { describe, expect, it } from 'vitest';

describe('SharpImageProcessor', (): void => {
  it('convierte una imagen PNG a WebP', async (): Promise<void> => {
    const processor = new SharpImageProcessor();
    const input: Buffer = await createTestPng();

    const result: ProcessedImage = await processor.convertToWebp(input);

    expect(result.mimeType).toBe('image/webp');
    expect(result.extension).toBe('.webp');
    expect(result.sizeBytes).toBe(result.buffer.length);
    expect(result.width).toBe(1);
    expect(result.height).toBe(1);

    const metadata: Metadata = await sharp(result.buffer).metadata();

    expect(metadata.format).toBe('webp');
    expect(metadata.width).toBe(1);
    expect(metadata.height).toBe(1);
  });

  it('calcula el SHA-256 sobre el WebP definitivo', async (): Promise<void> => {
    const processor = new SharpImageProcessor();
    const input: Buffer = await createTestPng();

    const result: ProcessedImage = await processor.convertToWebp(input);

    const expectedHash: string = createHash('sha256').update(result.buffer).digest('hex');

    expect(result.sha256).toBe(expectedHash);
  });

  it('rechaza datos que no contienen una imagen válida', async (): Promise<void> => {
    const processor = new SharpImageProcessor();

    await expect(processor.convertToWebp(Buffer.from('esto no es una imagen'))).rejects.toThrow(
      'El archivo recibido no contiene una imagen válida.',
    );
  });

  it('rechaza una imagen vacía', async (): Promise<void> => {
    const processor = new SharpImageProcessor();

    await expect(processor.convertToWebp(Buffer.alloc(0))).rejects.toThrow(
      'La imagen recibida está vacía.',
    );
  });
});

/**
 * Genera un PNG válido de un píxel para los tests.
 */
async function createTestPng(): Promise<Buffer> {
  return sharp({
    create: {
      width: 1,
      height: 1,
      channels: 4,
      background: {
        r: 255,
        g: 255,
        b: 255,
        alpha: 1,
      },
    },
  })
    .png()
    .toBuffer();
}
