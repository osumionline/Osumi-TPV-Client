import type {
  OtpvV3DecryptFileCommand,
  OtpvV3EncryptionResult,
} from '@backend/contracts/backup/otpv-v3-crypto.interface';
import {
  OTPV_V3_DEK_LENGTH_BYTES,
  OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
  OTPV_V3_GCM_IV_LENGTH_BYTES,
  OTPV_V3_KDF_ALGORITHM,
  OTPV_V3_KDF_LENGTH_BYTES,
  OTPV_V3_SALT_LENGTH_BYTES,
  OTPV_V3_SCRYPT_BLOCK_SIZE,
  OTPV_V3_SCRYPT_COST,
  OTPV_V3_SCRYPT_PARALLELIZATION,
} from '@backend/domain/backup/otpv-v3.constants';
import NodeOtpvV3Crypto from '@infrastructure/backup/node-otpv-v3-crypto';
import { access, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const BACKUP_API_KEY: string = 'test-backup-api-key-with-enough-random-material';

const AUTHENTICATED_DATA: Buffer = Buffer.from('{"formatVersion":3,"backupId":"test"}', 'utf8');

let tempDirectory: string | null = null;

describe('NodeOtpvV3Crypto', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-crypto-'));
  });

  afterEach(async (): Promise<void> => {
    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    tempDirectory = null;
  });

  it('cifra y descifra el payload recuperando exactamente los bytes originales', async (): Promise<void> => {
    const sourceFile: string = getPath('payload.zip');
    const encryptedFile: string = getPath('payload.enc');
    const restoredFile: string = getPath('restored.zip');
    const original: Buffer = Buffer.from(
      ['Contenido binario del payload ', 'de prueba de Osumi TPV.'].join(''),
      'utf8',
    );

    await writeFile(sourceFile, original);

    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();
    const encryption: OtpvV3EncryptionResult = await crypto.encryptFile({
      backupApiKey: BACKUP_API_KEY,
      authenticatedData: AUTHENTICATED_DATA,
      sourceFile,
      destinationFile: encryptedFile,
    });

    const encrypted: Buffer = await readFile(encryptedFile);

    expect(encrypted.equals(original)).toBe(false);

    await crypto.decryptFile(createDecryptCommand(encryption, encryptedFile, restoredFile));

    expect(await readFile(restoredFile)).toEqual(original);
  });

  it('genera el material criptográfico con las longitudes del contrato', async (): Promise<void> => {
    const sourceFile: string = getPath('payload.zip');

    await writeFile(sourceFile, 'payload');

    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();

    const result: OtpvV3EncryptionResult = await crypto.encryptFile({
      backupApiKey: BACKUP_API_KEY,
      authenticatedData: AUTHENTICATED_DATA,
      sourceFile,
      destinationFile: getPath('payload.enc'),
    });

    expect(Buffer.from(result.kdf.salt, 'base64')).toHaveLength(OTPV_V3_SALT_LENGTH_BYTES);
    expect(result.kdf.algorithm).toBe(OTPV_V3_KDF_ALGORITHM);
    expect(result.kdf.cost).toBe(OTPV_V3_SCRYPT_COST);
    expect(result.kdf.blockSize).toBe(OTPV_V3_SCRYPT_BLOCK_SIZE);
    expect(result.kdf.parallelization).toBe(OTPV_V3_SCRYPT_PARALLELIZATION);
    expect(result.kdf.length).toBe(OTPV_V3_KDF_LENGTH_BYTES);
    expect(Buffer.from(result.keyWrap.iv, 'base64')).toHaveLength(OTPV_V3_GCM_IV_LENGTH_BYTES);
    expect(Buffer.from(result.keyWrap.authTag, 'base64')).toHaveLength(
      OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
    );
    expect(Buffer.from(result.keyWrap.wrappedDek, 'base64')).toHaveLength(OTPV_V3_DEK_LENGTH_BYTES);
    expect(Buffer.from(result.payload.iv, 'base64')).toHaveLength(OTPV_V3_GCM_IV_LENGTH_BYTES);
    expect(Buffer.from(result.payload.authTag, 'base64')).toHaveLength(
      OTPV_V3_GCM_AUTH_TAG_LENGTH_BYTES,
    );

    expect(result.keyWrap.iv).not.toBe(result.payload.iv);
  });

  it('rechaza una TPV Backup key incorrecta sin materializar el destino', async (): Promise<void> => {
    const fixture = await createEncryptedFixture();
    const restoredFile: string = getPath('wrong-key.zip');
    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();

    await expect(
      crypto.decryptFile({
        ...createDecryptCommand(fixture.encryption, fixture.encryptedFile, restoredFile),
        backupApiKey: 'otra-clave-distinta',
      }),
    ).rejects.toThrow('La TPV Backup key no es correcta o el archivo está dañado.');

    expect(await fileExists(restoredFile)).toBe(false);
  });

  it('detecta un payload cifrado manipulado', async (): Promise<void> => {
    const fixture = await createEncryptedFixture();
    const encrypted: Buffer = await readFile(fixture.encryptedFile);

    encrypted[0] = (encrypted[0] ?? 0) ^ 0xff;

    await writeFile(fixture.encryptedFile, encrypted);

    const restoredFile: string = getPath('tampered.zip');
    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();

    await expect(
      crypto.decryptFile(
        createDecryptCommand(fixture.encryption, fixture.encryptedFile, restoredFile),
      ),
    ).rejects.toThrow('La TPV Backup key no es correcta o el archivo está dañado.');

    expect(await fileExists(restoredFile)).toBe(false);
  });

  it('detecta authenticatedData distinto del utilizado al cifrar', async (): Promise<void> => {
    const fixture = await createEncryptedFixture();
    const restoredFile: string = getPath('wrong-aad.zip');
    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();

    await expect(
      crypto.decryptFile({
        ...createDecryptCommand(fixture.encryption, fixture.encryptedFile, restoredFile),
        authenticatedData: Buffer.from('{"formatVersion":3,"backupId":"manipulado"}', 'utf8'),
      }),
    ).rejects.toThrow('La TPV Backup key no es correcta o el archivo está dañado.');

    expect(await fileExists(restoredFile)).toBe(false);
  });

  it('detecta la protección de DEK manipulada', async (): Promise<void> => {
    const fixture = await createEncryptedFixture();
    const alteredTag: Buffer = Buffer.from(fixture.encryption.keyWrap.authTag, 'base64');

    alteredTag[0] = (alteredTag[0] ?? 0) ^ 0xff;

    const restoredFile: string = getPath('tampered-key-wrap.zip');
    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();

    await expect(
      crypto.decryptFile({
        ...createDecryptCommand(fixture.encryption, fixture.encryptedFile, restoredFile),
        keyWrap: {
          ...fixture.encryption.keyWrap,
          authTag: alteredTag.toString('base64'),
        },
      }),
    ).rejects.toThrow('La TPV Backup key no es correcta o el archivo está dañado.');

    expect(await fileExists(restoredFile)).toBe(false);
  });

  it('no sobrescribe un destino existente', async (): Promise<void> => {
    const sourceFile: string = getPath('payload.zip');
    const destinationFile: string = getPath('payload.enc');

    await writeFile(sourceFile, 'payload');
    await writeFile(destinationFile, 'existente');

    const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();

    await expect(
      crypto.encryptFile({
        backupApiKey: BACKUP_API_KEY,
        authenticatedData: AUTHENTICATED_DATA,
        sourceFile,
        destinationFile,
      }),
    ).rejects.toThrow('El fichero de destino ya existe.');

    expect(
      await readFile(destinationFile, {
        encoding: 'utf8',
      }),
    ).toBe('existente');
  });
});

interface EncryptedFixture {
  readonly encryptedFile: string;
  readonly encryption: OtpvV3EncryptionResult;
}

/**
 * Crea un payload cifrado reutilizable
 * en las pruebas de manipulación.
 */
async function createEncryptedFixture(): Promise<EncryptedFixture> {
  const sourceFile: string = getPath('fixture-payload.zip');
  const encryptedFile: string = getPath('fixture-payload.enc');

  await writeFile(sourceFile, Buffer.from('payload autenticado', 'utf8'));

  const crypto: NodeOtpvV3Crypto = new NodeOtpvV3Crypto();

  const encryption: OtpvV3EncryptionResult = await crypto.encryptFile({
    backupApiKey: BACKUP_API_KEY,
    authenticatedData: AUTHENTICATED_DATA,
    sourceFile,
    destinationFile: encryptedFile,
  });

  return {
    encryptedFile,
    encryption,
  };
}

/**
 * Construye el comando normal de descifrado
 * a partir del resultado de cifrado.
 */
function createDecryptCommand(
  encryption: OtpvV3EncryptionResult,
  sourceFile: string,
  destinationFile: string,
): OtpvV3DecryptFileCommand {
  return {
    backupApiKey: BACKUP_API_KEY,
    authenticatedData: AUTHENTICATED_DATA,
    kdf: encryption.kdf,
    keyWrap: encryption.keyWrap,
    payload: encryption.payload,
    sourceFile,
    destinationFile,
  };
}

/**
 * Construye una ruta dentro del directorio
 * temporal del test.
 */
function getPath(fileName: string): string {
  if (tempDirectory === null) {
    throw new Error('El directorio temporal no está inicializado.');
  }

  return join(tempDirectory, fileName);
}

/**
 * Comprueba la existencia de un fichero
 * sin propagar ENOENT.
 */
async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);

    return true;
  } catch {
    return false;
  }
}
