import type LogoStorage from '@backend/contracts/logo-storage.interface';
import type { InstallationLogoData } from '@desktop-contracts/configuration/installation-command.interface';
import { nativeImage } from 'electron';
import { access, rename, rm, writeFile } from 'node:fs/promises';

const MAX_LOGO_FILE_SIZE: number = 5 * 1024 * 1024;
const MAX_LOGO_DIMENSION: number = 4096;

export default class ElectronLogoStorage implements LogoStorage {
  constructor(private readonly filePath: string) {}

  async exists(): Promise<boolean> {
    try {
      await access(this.filePath);

      return true;
    } catch {
      return false;
    }
  }

  async save(logo: InstallationLogoData): Promise<void> {
    const separatorPosition: number = logo.dataUrl.indexOf(',');

    if (separatorPosition === -1) {
      throw new Error('El Data URL del logo no es válido.');
    }

    const encodedData: string = logo.dataUrl.slice(separatorPosition + 1);

    if (!/^[A-Za-z0-9+/]*={0,2}$/.test(encodedData)) {
      throw new Error('El contenido Base64 del logo no es válido.');
    }

    const originalBuffer: Buffer = Buffer.from(encodedData, 'base64');

    if (originalBuffer.length > MAX_LOGO_FILE_SIZE) {
      throw new Error('El logo no puede superar los 5 MB.');
    }

    const image: Electron.NativeImage = nativeImage.createFromDataURL(logo.dataUrl);

    if (image.isEmpty()) {
      throw new Error('El logo recibido no contiene una imagen válida.');
    }

    const size: Electron.Size = image.getSize();

    if (size.width <= 0 || size.height <= 0) {
      throw new Error('Las dimensiones del logo no son válidas.');
    }

    if (size.width > MAX_LOGO_DIMENSION || size.height > MAX_LOGO_DIMENSION) {
      throw new Error('El logo no puede superar 4096 píxeles de ancho o alto.');
    }

    const pngBuffer: Buffer = image.toPNG();

    if (pngBuffer.length === 0) {
      throw new Error('No se ha podido convertir el logo a PNG.');
    }

    const temporaryFilePath: string = `${this.filePath}.tmp`;

    await writeFile(temporaryFilePath, pngBuffer, {
      mode: 0o600,
    });

    await rename(temporaryFilePath, this.filePath);
  }

  async delete(): Promise<void> {
    await rm(this.filePath, {
      force: true,
    });
  }
}
