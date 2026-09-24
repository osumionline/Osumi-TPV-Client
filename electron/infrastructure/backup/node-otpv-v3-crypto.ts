import type {
  OtpvV3Crypto,
  OtpvV3DecryptFileCommand,
  OtpvV3EncryptFileCommand,
  OtpvV3EncryptStreamCommand,
  OtpvV3EncryptionResult,
} from '@backend/contracts/backup/otpv-v3-crypto.interface';
import type {
  OtpvV3Kdf,
  OtpvV3KeyWrap,
  OtpvV3PayloadEncryption,
} from '@backend/contracts/backup/otpv-v3-manifest.interface';
import {
  OTPV_V3_DEK_LENGTH_BYTES,
  OTPV_V3_ENCRYPTION_ALGORITHM,
  OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
  OTPV_V3_GCM_IV_LENGTH_BYTES,
  OTPV_V3_KDF_ALGORITHM,
  OTPV_V3_KDF_INFO,
  OTPV_V3_KDF_LENGTH_BYTES,
  OTPV_V3_KEY_WRAP_AAD_PREFIX,
  OTPV_V3_PAYLOAD_AAD_PREFIX,
  OTPV_V3_PAYLOAD_ENTRY,
  OTPV_V3_PAYLOAD_FORMAT,
  OTPV_V3_SALT_LENGTH_BYTES,
} from '@backend/domain/backup/otpv-v3.constants';
import { createCipheriv, createDecipheriv, hkdfSync, randomBytes, randomUUID } from 'node:crypto';
import { createReadStream, createWriteStream } from 'node:fs';
import { access, mkdir, rename, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import type { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

interface WrappedDekResult {
  readonly wrappedDek: Buffer;
  readonly authTag: Buffer;
}

/**
 * Implementa la criptografía del formato `.otpv` v3
 * utilizando las primitivas nativas de Node.js.
 */
export default class NodeOtpvV3Crypto implements OtpvV3Crypto {
  /**
   * Genera el material criptográfico de una copia
   * y cifra el ZIP interior mediante streaming.
   */
  /**
   * Cifra un fichero que contiene el ZIP interior
   * reutilizando la implementación streaming.
   */
  async encryptFile(command: OtpvV3EncryptFileCommand): Promise<OtpvV3EncryptionResult> {
    this.assertDifferentPaths(command.sourceFile, command.destinationFile);

    return this.encryptStream({
      backupApiKey: command.backupApiKey,
      authenticatedData: command.authenticatedData,
      sourceStream: createReadStream(command.sourceFile),
      destinationFile: command.destinationFile,
    });
  }

  /**
   * Genera el material criptográfico de una copia
   * y cifra el ZIP interior recibido como stream.
   */
  async encryptStream(command: OtpvV3EncryptStreamCommand): Promise<OtpvV3EncryptionResult> {
    this.assertBackupApiKey(command.backupApiKey);

    await this.assertDestinationDoesNotExist(command.destinationFile);

    const salt: Buffer = randomBytes(OTPV_V3_SALT_LENGTH_BYTES);
    const dek: Buffer = randomBytes(OTPV_V3_DEK_LENGTH_BYTES);
    const kek: Buffer = this.deriveKek(command.backupApiKey, salt);
    const keyWrapIv: Buffer = randomBytes(OTPV_V3_GCM_IV_LENGTH_BYTES);
    const payloadIv: Buffer = this.generateDistinctIv(keyWrapIv);

    const keyWrapAad: Buffer = this.createAad(
      OTPV_V3_KEY_WRAP_AAD_PREFIX,
      command.authenticatedData,
    );

    const payloadAad: Buffer = this.createAad(
      OTPV_V3_PAYLOAD_AAD_PREFIX,
      command.authenticatedData,
    );

    try {
      const wrappedDek: WrappedDekResult = this.wrapDek(kek, dek, keyWrapIv, keyWrapAad);

      const payloadAuthTag: Buffer = await this.encryptPayloadStream(
        command.sourceStream,
        command.destinationFile,
        dek,
        payloadIv,
        payloadAad,
      );

      const kdf: OtpvV3Kdf = {
        algorithm: OTPV_V3_KDF_ALGORITHM,
        salt: salt.toString('base64'),
        info: OTPV_V3_KDF_INFO,
        length: OTPV_V3_KDF_LENGTH_BYTES,
      };

      const keyWrap: OtpvV3KeyWrap = {
        algorithm: OTPV_V3_ENCRYPTION_ALGORITHM,
        iv: keyWrapIv.toString('base64'),
        authTag: wrappedDek.authTag.toString('base64'),
        wrappedDek: wrappedDek.wrappedDek.toString('base64'),
      };

      const payload: OtpvV3PayloadEncryption = {
        entry: OTPV_V3_PAYLOAD_ENTRY,
        format: OTPV_V3_PAYLOAD_FORMAT,
        algorithm: OTPV_V3_ENCRYPTION_ALGORITHM,
        iv: payloadIv.toString('base64'),
        authTag: payloadAuthTag.toString('base64'),
      };

      return {
        kdf,
        keyWrap,
        payload,
      };
    } finally {
      kek.fill(0);

      dek.fill(0);
    }
  }

  /**
   * Recupera la DEK mediante la TPV Backup key
   * y descifra el payload completo.
   */
  async decryptFile(command: OtpvV3DecryptFileCommand): Promise<void> {
    this.assertBackupApiKey(command.backupApiKey);
    this.assertDifferentPaths(command.sourceFile, command.destinationFile);

    await this.assertDestinationDoesNotExist(command.destinationFile);

    const salt: Buffer = this.decodeBase64(command.kdf.salt, OTPV_V3_SALT_LENGTH_BYTES, 'kdf.salt');

    const keyWrapIv: Buffer = this.decodeBase64(
      command.keyWrap.iv,
      OTPV_V3_GCM_IV_LENGTH_BYTES,
      'keyWrap.iv',
    );

    const keyWrapAuthTag: Buffer = this.decodeBase64(
      command.keyWrap.authTag,
      OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
      'keyWrap.authTag',
    );

    const wrappedDek: Buffer = this.decodeBase64(
      command.keyWrap.wrappedDek,
      OTPV_V3_DEK_LENGTH_BYTES,
      'keyWrap.wrappedDek',
    );

    const payloadIv: Buffer = this.decodeBase64(
      command.payload.iv,
      OTPV_V3_GCM_IV_LENGTH_BYTES,
      'payload.iv',
    );

    const payloadAuthTag: Buffer = this.decodeBase64(
      command.payload.authTag,
      OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
      'payload.authTag',
    );

    const kek: Buffer = this.deriveKek(command.backupApiKey, salt);

    let dek: Buffer | null = null;

    try {
      const keyWrapAad: Buffer = this.createAad(
        OTPV_V3_KEY_WRAP_AAD_PREFIX,
        command.authenticatedData,
      );

      const payloadAad: Buffer = this.createAad(
        OTPV_V3_PAYLOAD_AAD_PREFIX,
        command.authenticatedData,
      );

      try {
        dek = this.unwrapDek(kek, wrappedDek, keyWrapIv, keyWrapAuthTag, keyWrapAad);
      } catch (error: unknown) {
        throw this.createDecryptionError(error);
      }

      try {
        await this.decryptPayloadFile(
          command.sourceFile,
          command.destinationFile,
          dek,
          payloadIv,
          payloadAuthTag,
          payloadAad,
        );
      } catch (error: unknown) {
        throw this.createDecryptionError(error);
      }
    } finally {
      kek.fill(0);

      if (dek !== null) {
        dek.fill(0);
      }
    }
  }

  /**
   * Deriva la KEK mediante HKDF-SHA-256
   * usando exactamente los bytes UTF-8 de backupApiKey.
   */
  private deriveKek(backupApiKey: string, salt: Buffer): Buffer {
    return Buffer.from(
      hkdfSync(
        'sha256',
        Buffer.from(backupApiKey, 'utf8'),
        salt,
        Buffer.from(OTPV_V3_KDF_INFO, 'utf8'),
        OTPV_V3_KDF_LENGTH_BYTES,
      ),
    );
  }

  /**
   * Cifra la DEK con la KEK mediante AES-256-GCM.
   */
  private wrapDek(kek: Buffer, dek: Buffer, iv: Buffer, aad: Buffer): WrappedDekResult {
    const cipher = createCipheriv(OTPV_V3_ENCRYPTION_ALGORITHM, kek, iv, {
      authTagLength: OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
    });

    cipher.setAAD(aad);

    const wrappedDek: Buffer = Buffer.concat([cipher.update(dek), cipher.final()]);

    return {
      wrappedDek,
      authTag: cipher.getAuthTag(),
    };
  }

  /**
   * Descifra y autentica la DEK protegida
   * mediante la KEK.
   */
  private unwrapDek(
    kek: Buffer,
    wrappedDek: Buffer,
    iv: Buffer,
    authTag: Buffer,
    aad: Buffer,
  ): Buffer {
    const decipher = createDecipheriv(OTPV_V3_ENCRYPTION_ALGORITHM, kek, iv, {
      authTagLength: OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
    });

    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    const dek: Buffer = Buffer.concat([decipher.update(wrappedDek), decipher.final()]);

    if (dek.length !== OTPV_V3_DEK_LENGTH_BYTES) {
      throw new Error('La DEK recuperada no tiene la longitud esperada.');
    }

    return dek;
  }

  /**
   * Cifra el stream del ZIP interior
   * y devuelve su authentication tag.
   */
  private async encryptPayloadStream(
    sourceStream: Readable,
    destinationFile: string,
    dek: Buffer,
    iv: Buffer,
    aad: Buffer,
  ): Promise<Buffer> {
    const temporaryFile: string = await this.createTemporaryDestination(destinationFile);

    const cipher = createCipheriv(OTPV_V3_ENCRYPTION_ALGORITHM, dek, iv, {
      authTagLength: OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
    });

    cipher.setAAD(aad);

    try {
      await pipeline(
        sourceStream,
        cipher,
        createWriteStream(temporaryFile, {
          flags: 'wx',

          mode: 0o600,
        }),
      );

      const authTag: Buffer = cipher.getAuthTag();

      await rename(temporaryFile, destinationFile);

      return authTag;
    } catch (error: unknown) {
      await this.removeTemporaryFileSafely(temporaryFile);

      throw error;
    }
  }

  /**
   * Descifra el payload mediante streaming
   * y solo promociona el resultado tras validar GCM.
   */
  private async decryptPayloadFile(
    sourceFile: string,
    destinationFile: string,
    dek: Buffer,
    iv: Buffer,
    authTag: Buffer,
    aad: Buffer,
  ): Promise<void> {
    const temporaryFile: string = await this.createTemporaryDestination(destinationFile);

    const decipher = createDecipheriv(OTPV_V3_ENCRYPTION_ALGORITHM, dek, iv, {
      authTagLength: OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
    });

    decipher.setAAD(aad);
    decipher.setAuthTag(authTag);

    try {
      await pipeline(
        createReadStream(sourceFile),
        decipher,
        createWriteStream(temporaryFile, {
          flags: 'wx',

          mode: 0o600,
        }),
      );

      await rename(temporaryFile, destinationFile);
    } catch (error: unknown) {
      await this.removeTemporaryFileSafely(temporaryFile);
      throw error;
    }
  }

  /**
   * Construye el AAD exacto definido
   * por el contrato `.otpv` v3.
   */
  private createAad(prefix: string, authenticatedData: Buffer): Buffer {
    return Buffer.concat([Buffer.from(prefix, 'utf8'), authenticatedData]);
  }

  /**
   * Genera un IV de payload distinto
   * del utilizado para proteger la DEK.
   */
  private generateDistinctIv(otherIv: Buffer): Buffer {
    let iv: Buffer;

    do {
      iv = randomBytes(OTPV_V3_GCM_IV_LENGTH_BYTES);
    } while (iv.equals(otherIv));

    return iv;
  }

  /**
   * Decodifica Base64 canónico y comprueba
   * la longitud binaria esperada.
   */
  private decodeBase64(value: string, expectedLength: number, fieldName: string): Buffer {
    const decoded: Buffer = Buffer.from(value, 'base64');

    if (decoded.length !== expectedLength || decoded.toString('base64') !== value) {
      throw new Error(`El campo ${fieldName} no contiene Base64 válido.`);
    }

    return decoded;
  }

  /**
   * Comprueba que la TPV Backup key
   * contenga al menos un byte.
   */
  private assertBackupApiKey(backupApiKey: string): void {
    if (backupApiKey.length === 0) {
      throw new Error('La TPV Backup key no puede estar vacía.');
    }
  }

  /**
   * Impide cifrar o descifrar un fichero
   * sobre sí mismo.
   */
  private assertDifferentPaths(sourceFile: string, destinationFile: string): void {
    if (resolve(sourceFile) === resolve(destinationFile)) {
      throw new Error('El origen y el destino criptográfico deben ser distintos.');
    }
  }

  /**
   * Evita sobrescribir un fichero definitivo
   * ya existente.
   */
  private async assertDestinationDoesNotExist(destinationFile: string): Promise<void> {
    try {
      await access(destinationFile);
    } catch {
      return;
    }

    throw new Error('El fichero de destino ya existe.');
  }

  /**
   * Prepara la carpeta destino y genera
   * una ruta temporal única.
   */
  private async createTemporaryDestination(destinationFile: string): Promise<string> {
    const directory: string = dirname(destinationFile);

    await mkdir(directory, {
      recursive: true,
    });

    return join(directory, `.crypto-${randomUUID()}.tmp`);
  }

  /**
   * Crea el error funcional común para
   * fallos de autenticación criptográfica.
   */
  private createDecryptionError(cause: unknown): Error {
    return new Error(
      [
        'No se puede abrir la copia de seguridad.',
        'La TPV Backup key no es correcta',
        'o el archivo está dañado.',
      ].join(' '),
      {
        cause,
      },
    );
  }

  /**
   * Limpia un temporal sin ocultar
   * el error principal.
   */
  private async removeTemporaryFileSafely(temporaryFile: string): Promise<void> {
    try {
      await rm(temporaryFile, {
        force: true,
      });
    } catch (cleanupError: unknown) {
      console.error('No se ha podido limpiar un temporal criptográfico:', cleanupError);
    }
  }
}
