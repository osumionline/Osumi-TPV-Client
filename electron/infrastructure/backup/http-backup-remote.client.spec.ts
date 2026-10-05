import { BackupRemoteClientError } from '@backend/contracts/backup/backup-remote-client.error';
import type { BackupRemoteSession } from '@backend/contracts/backup/backup-remote-client.interface';
import { BackupRemoteBackup } from '@desktop-contracts/backup/backup-remote.interface';
import HttpBackupRemoteClient from '@infrastructure/backup/http-backup-remote.client';
import { describe, expect, it } from 'vitest';

type FetchInput = Parameters<typeof globalThis.fetch>[0];

describe('HttpBackupRemoteClient', (): void => {
  it('autentica una instalación mediante keyId y secret', async (): Promise<void> => {
    let capturedInput: FetchInput | null = null;
    let capturedInit: RequestInit | undefined;

    const fetchImplementation: typeof globalThis.fetch = async (
      input: FetchInput,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedInput = input;
      capturedInit = init;

      return new Response(
        JSON.stringify({
          status: 'ok',
          message: '',
          token: 'test-token',
          expiresAt: 1_800_000_000,
          installation: {
            publicId: 'installation-public-id',
            name: 'Tienda',
          },
          subscription: {
            publicId: 'subscription-public-id',
            name: 'Indomables',
            status: 'active',
          },
          canUpload: true,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    };

    const client = new HttpBackupRemoteClient('https://backup.test/api/v1/', fetchImplementation);

    const result: BackupRemoteSession = await client.authenticate({
      keyId: 'key-id',
      secret: 'secret-value',
    });

    expect(getInputUrl(capturedInput)).toBe('https://backup.test/api/v1/auth/token');
    expect(capturedInit?.method).toBe('POST');

    const headers = new Headers(capturedInit?.headers);

    expect(headers.get('Content-Type')).toBe('application/json');

    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      keyId: 'key-id',
      secret: 'secret-value',
    });

    expect(result).toEqual({
      token: 'test-token',
      expiresAt: 1_800_000_000,
      installation: {
        publicId: 'installation-public-id',
        name: 'Tienda',
      },
      subscription: {
        publicId: 'subscription-public-id',
        name: 'Indomables',
        status: 'active',
      },
      canUpload: true,
    });
  });

  it('lista las copias utilizando el bearer token', async (): Promise<void> => {
    let capturedInput: FetchInput | null = null;
    let capturedInit: RequestInit | undefined;

    const fetchImplementation: typeof globalThis.fetch = async (
      input: FetchInput,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedInput = input;
      capturedInit = init;

      return new Response(
        JSON.stringify({
          status: 'ok',
          message: '',
          list: [
            {
              publicId: 'backup-public-id',
              backupId: '123e4567-e89b-42d3-a456-426614174000',
              createdAtClient: '2026-10-05 07:18:39',
              formatVersion: 3,
              applicationVersion: '0.0.0',
              databaseSchemaVersion: 1,
              originalFilename: 'backup.otpv',
              sizeBytes: 18_985_903,
              sha256: '6bbab7ae745310e03a8a6b07d6fb7e01e94e4017c9f7355bf695eb5aab3a71b8',
              createdAt: '2026-10-05 09:20:58',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    };

    const client = new HttpBackupRemoteClient('https://backup.test/api/v1', fetchImplementation);

    const result: readonly BackupRemoteBackup[] = await client.list('test-token');

    expect(getInputUrl(capturedInput)).toBe('https://backup.test/api/v1/backups');
    expect(capturedInit?.method).toBe('GET');

    const headers = new Headers(capturedInit?.headers);

    expect(headers.get('Authorization')).toBe('Bearer test-token');

    expect(result).toHaveLength(1);
    expect(result[0]?.publicId).toBe('backup-public-id');
    expect(result[0]?.sizeBytes).toBe(18_985_903);
  });

  it('clasifica un 401 como credenciales no válidas', async (): Promise<void> => {
    const fetchImplementation: typeof globalThis.fetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid installation credentials.',
        }),
        {
          status: 401,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

    const client = new HttpBackupRemoteClient('https://backup.test/api/v1', fetchImplementation);

    try {
      await client.authenticate({
        keyId: 'invalid-key',
        secret: 'invalid-secret',
      });

      throw new Error('Se esperaba un error de autenticación.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BackupRemoteClientError);

      if (!(error instanceof BackupRemoteClientError)) {
        return;
      }

      expect(error.kind).toBe('unauthorized');
      expect(error.httpStatus).toBe(401);
    }
  });

  it('clasifica un fallo de red como temporal', async (): Promise<void> => {
    const fetchImplementation: typeof globalThis.fetch = async (): Promise<Response> => {
      throw new Error('network unavailable');
    };

    const client = new HttpBackupRemoteClient('https://backup.test/api/v1', fetchImplementation);

    try {
      await client.list('test-token');

      throw new Error('Se esperaba un error temporal.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BackupRemoteClientError);

      if (!(error instanceof BackupRemoteClientError)) {
        return;
      }

      expect(error.kind).toBe('temporary');
      expect(error.httpStatus).toBeNull();
    }
  });

  it('rechaza una respuesta 200 con estructura inesperada', async (): Promise<void> => {
    const fetchImplementation: typeof globalThis.fetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          status: 'ok',
          message: '',
          list: [
            {
              publicId: 'backup-public-id',
            },
          ],
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

    const client = new HttpBackupRemoteClient('https://backup.test/api/v1', fetchImplementation);

    try {
      await client.list('test-token');

      throw new Error('Se esperaba una respuesta no válida.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(BackupRemoteClientError);

      if (!(error instanceof BackupRemoteClientError)) {
        return;
      }

      expect(error.kind).toBe('invalid-response');
      expect(error.httpStatus).toBe(200);
    }
  });
});

/**
 * Obtiene la URL textual recibida por fetch.
 */
function getInputUrl(input: FetchInput | null): string {
  if (input === null) {
    throw new Error('El cliente no ha realizado ninguna petición.');
  }

  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}
