import type {
  ImageProcessor,
  ProcessedImage,
} from '@backend/contracts/system/image-processor.interface';
import type { InstallationLogoData } from '@desktop-contracts/configuration/installation-command.interface';
import ElectronLogoStorage from '@infrastructure/electron/electron-logo.storage';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;

class FakeImageProcessor implements ImageProcessor {
  width: number = 800;
  height: number = 600;
  receivedBuffer: Buffer | null = null;

  /**
   * Simula la conversión común de una imagen a WebP.
   */
  convertToWebp(input: Buffer): Promise<ProcessedImage> {
    this.receivedBuffer = input;

    const buffer: Buffer = Buffer.from('processed-webp');

    return Promise.resolve({
      buffer,
      mimeType: 'image/webp',
      extension: '.webp',
      sizeBytes: buffer.length,
      sha256: 'a'.repeat(64),
      width: this.width,
      height: this.height,
    });
  }
}

describe('ElectronLogoStorage', (): void => {
  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('convierte y persiste el logo como WebP', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-logo-'));

    const processor = new FakeImageProcessor();

    const filePath: string = join(tempDirectory, 'logo.webp');

    const storage = new ElectronLogoStorage(filePath, processor);

    const original: Buffer = Buffer.from('original-image');

    await storage.save(createLogoData(original));

    expect(processor.receivedBuffer).toEqual(original);

    expect(await readFile(filePath)).toEqual(Buffer.from('processed-webp'));

    expect(await storage.exists()).toBe(true);
  });

  it('rechaza logos que superan las dimensiones permitidas', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-logo-'));

    const processor = new FakeImageProcessor();

    processor.width = 4097;

    const storage = new ElectronLogoStorage(join(tempDirectory, 'logo.webp'), processor);

    await expect(storage.save(createLogoData(Buffer.from('original')))).rejects.toThrow(
      'El logo no puede superar 4096 píxeles de ancho o alto.',
    );
  });

  it('elimina el logo persistido', async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-logo-'));

    const storage = new ElectronLogoStorage(
      join(tempDirectory, 'logo.webp'),
      new FakeImageProcessor(),
    );

    await storage.save(createLogoData(Buffer.from('original')));

    await storage.delete();

    expect(await storage.exists()).toBe(false);
  });
});

/**
 * Crea los datos de logo utilizados en los tests.
 */
function createLogoData(buffer: Buffer): InstallationLogoData {
  return {
    fileName: 'logo.png',
    mimeType: 'image/png',
    dataUrl: `data:image/png;base64,${buffer.toString('base64')}`,
  };
}
