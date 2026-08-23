import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import { safeStorage } from 'electron';
import { readFile, rename, rm, writeFile } from 'node:fs/promises';

interface EncryptedSecretsFile {
  readonly schemaVersion: number;
  readonly encryptedData: string;
}

type StoredInstallationSecretsData = Omit<
  InstallationSecretsData,
  'emailSmtpPass' | 'ticketBaiToken'
> & {
  readonly emailSmtpPass?: string | null;
  readonly ticketBaiToken?: string | null;
};

function isFileNotFoundError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function isEncryptedSecretsFile(value: unknown): value is EncryptedSecretsFile {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data: Record<string, unknown> = value as Record<string, unknown>;

  return typeof data['schemaVersion'] === 'number' && typeof data['encryptedData'] === 'string';
}

function isOptionalNullableString(value: unknown): boolean {
  return value === undefined || value === null || typeof value === 'string';
}

function isStoredInstallationSecretsData(value: unknown): value is StoredInstallationSecretsData {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    return false;
  }

  const data: Record<string, unknown> = value as Record<string, unknown>;

  return (
    typeof data['secretApi'] === 'string' &&
    typeof data['backupApiKey'] === 'string' &&
    isOptionalNullableString(data['emailSmtpPass']) &&
    isOptionalNullableString(data['ticketBaiToken'])
  );
}

export default class ElectronSafeStorageSecretStorage implements SecretStorage {
  constructor(private readonly filePath: string) {}

  async exists(): Promise<boolean> {
    const secrets: InstallationSecretsData | null = await this.load();

    return secrets !== null;
  }

  async load(): Promise<InstallationSecretsData | null> {
    try {
      const content: string = await readFile(this.filePath, {
        encoding: 'utf8',
      });

      const parsedFile: unknown = JSON.parse(content);

      if (!isEncryptedSecretsFile(parsedFile)) {
        throw new Error('El archivo de secretos no tiene una estructura válida.');
      }

      const encryptedBuffer: Buffer = Buffer.from(parsedFile.encryptedData, 'base64');

      const decryptedResult: {
        readonly result: string;
        readonly shouldReEncrypt: boolean;
      } = await safeStorage.decryptStringAsync(encryptedBuffer);

      const parsedSecrets: unknown = JSON.parse(decryptedResult.result);

      if (!isStoredInstallationSecretsData(parsedSecrets)) {
        throw new Error('Los secretos almacenados no tienen una estructura válida.');
      }

      const secrets: InstallationSecretsData = {
        secretApi: parsedSecrets.secretApi,
        backupApiKey: parsedSecrets.backupApiKey,
        emailSmtpPass: parsedSecrets.emailSmtpPass ?? null,
        ticketBaiToken: parsedSecrets.ticketBaiToken ?? null,
      };

      if (decryptedResult.shouldReEncrypt) {
        await this.save(secrets);
      }

      return secrets;
    } catch (error: unknown) {
      if (isFileNotFoundError(error)) {
        return null;
      }

      throw error;
    }
  }

  async save(secrets: InstallationSecretsData): Promise<void> {
    const encryptionAvailable: boolean = await safeStorage.isAsyncEncryptionAvailable();

    if (!encryptionAvailable) {
      throw new Error('El sistema operativo no ofrece almacenamiento seguro.');
    }

    const plainText: string = JSON.stringify(secrets);

    const encryptedBuffer: Buffer = await safeStorage.encryptStringAsync(plainText);

    const encryptedFile: EncryptedSecretsFile = {
      schemaVersion: 1,
      encryptedData: encryptedBuffer.toString('base64'),
    };

    const temporaryFilePath: string = `${this.filePath}.tmp`;

    await writeFile(temporaryFilePath, `${JSON.stringify(encryptedFile, null, 2)}\n`, {
      encoding: 'utf8',
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
