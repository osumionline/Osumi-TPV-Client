import type OtpvV3RestoreWorkspace from '@backend/contracts/backup/otpv-v3-restore-workspace.interface';
import { mkdir, rm } from 'node:fs/promises';
import { join } from 'node:path';

/**
 * Gestiona el espacio temporal utilizado
 * durante una restauración `.otpv` v3.
 */
export default class FileOtpvV3RestoreWorkspace implements OtpvV3RestoreWorkspace {
  readonly encryptedPayloadFile: string;
  readonly decryptedPayloadFile: string;

  /**
   * Crea el workspace dentro del directorio indicado.
   */
  constructor(private readonly workDirectory: string) {
    this.encryptedPayloadFile = join(this.workDirectory, 'payload.enc');
    this.decryptedPayloadFile = join(this.workDirectory, 'payload.zip');
  }

  /**
   * Elimina cualquier intento anterior
   * y crea un workspace vacío.
   */
  async reset(): Promise<void> {
    await this.clear();

    await mkdir(this.workDirectory, {
      recursive: true,
    });
  }

  /**
   * Elimina el payload cifrado una vez
   * autenticado y descifrado correctamente.
   */
  async removeEncryptedPayload(): Promise<void> {
    await rm(this.encryptedPayloadFile, {
      force: true,
    });
  }

  /**
   * Elimina todo el workspace de restauración.
   */
  async clear(): Promise<void> {
    await rm(this.workDirectory, {
      recursive: true,
      force: true,
    });
  }
}
