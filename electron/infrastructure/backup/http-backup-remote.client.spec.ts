import { BackupRemoteClientError } from '@backend/contracts/backup/backup-remote-client.error';
import type {
  BackupRemoteDownloadTransferResult,
  BackupRemoteSession,
} from '@backend/contracts/backup/backup-remote-client.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import HttpBackupRemoteClient from '@infrastructure/backup/http-backup-remote.client';
import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
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

  it('sube una copia mediante multipart sin materializar el fichero completo', async (): Promise<void> => {
    let capturedInput: FetchInput | null = null;
    let capturedInit: RequestInit | undefined;
    let openedPath: string | null = null;
    let openedType: string | null = null;

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
          backup: {
            publicId: 'backup-public-id',
            backupId: '123e4567-e89b-42d3-a456-426614174000',
            createdAtClient: '2026-10-05 07:18:39',
            originalFilename: 'backup.otpv',
            sizeBytes: 11,
            sha256: '6bbab7ae745310e03a8a6b07d6fb7e01e94e4017c9f7355bf695eb5aab3a71b8',
          },
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    };

    const openFileAsBlob = async (
      path: string,
      options?: {
        readonly type?: string;
      },
    ): Promise<Blob> => {
      openedPath = path;
      openedType = options?.type ?? null;

      return new Blob(['otpv-backup'], {
        type: options?.type,
      });
    };

    const client = new HttpBackupRemoteClient(
      'https://backup.test/api/v1',
      fetchImplementation,
      openFileAsBlob,
    );

    const result: BackupRemoteUploadResult = await client.upload(
      'test-token',
      'C:\\backups\\backup.otpv',
      'backup.otpv',
    );

    expect(openedPath).toBe('C:\\backups\\backup.otpv');
    expect(openedType).toBe('application/octet-stream');
    expect(getInputUrl(capturedInput)).toBe('https://backup.test/api/v1/backups');
    expect(capturedInit?.method).toBe('POST');

    const headers = new Headers(capturedInit?.headers);

    expect(headers.get('Authorization')).toBe('Bearer test-token');
    expect(headers.get('Content-Type')).toBeNull();

    const body: RequestInit['body'] = capturedInit?.body;

    expect(body).toBeInstanceOf(FormData);

    if (!(body instanceof FormData)) {
      throw new Error('Se esperaba un cuerpo FormData.');
    }

    const uploadedFile: File | string | null = body.get('file');

    expect(uploadedFile).toBeInstanceOf(Blob);

    if (!(uploadedFile instanceof Blob)) {
      throw new Error('Se esperaba un fichero multipart.');
    }

    expect(uploadedFile.size).toBe(11);
    expect('name' in uploadedFile ? uploadedFile.name : null).toBe('backup.otpv');

    expect(result).toEqual({
      publicId: 'backup-public-id',
      backupId: '123e4567-e89b-42d3-a456-426614174000',
      createdAtClient: '2026-10-05 07:18:39',
      originalFilename: 'backup.otpv',
      sizeBytes: 11,
      sha256: '6bbab7ae745310e03a8a6b07d6fb7e01e94e4017c9f7355bf695eb5aab3a71b8',
    });
  });

  it('descarga una copia por streaming y calcula su integridad', async (): Promise<void> => {
    const content: Buffer = Buffer.from('remote-otpv-download', 'utf8');

    const expectedSha256: string = createHash('sha256').update(content).digest('hex');

    let capturedInput: FetchInput | null = null;
    let capturedInit: RequestInit | undefined;

    const fetchImplementation: typeof globalThis.fetch = async (
      input: FetchInput,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedInput = input;
      capturedInit = init;

      return new Response(content, {
        status: 200,

        headers: {
          'Content-Type': 'application/octet-stream',

          'Content-Length': String(content.length),
        },
      });
    };

    const tempDirectory: string = await mkdtemp(join(tmpdir(), 'osumi-tpv-remote-download-'));

    try {
      const destinationFile: string = join(tempDirectory, 'backup.otpv');

      const client = new HttpBackupRemoteClient('https://backup.test/api/v1', fetchImplementation);

      const result: BackupRemoteDownloadTransferResult = await client.download(
        'test-token',
        'backup public/id',
        destinationFile,
      );

      expect(getInputUrl(capturedInput)).toBe(
        'https://backup.test/api/v1/backups/backup%20public%2Fid/download',
      );

      expect(capturedInit?.method).toBe('GET');

      const headers = new Headers(capturedInit?.headers);

      expect(headers.get('Authorization')).toBe('Bearer test-token');

      expect(await readFile(destinationFile)).toEqual(content);

      expect(result).toEqual({
        sizeBytes: content.length,
        sha256: expectedSha256,
      });
    } finally {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }
  });

  it('elimina el fichero parcial si la descarga queda incompleta', async (): Promise<void> => {
    const content: Buffer = Buffer.from('partial-download', 'utf8');

    const fetchImplementation: typeof globalThis.fetch = async (): Promise<Response> =>
      new Response(content, {
        status: 200,

        headers: {
          'Content-Type': 'application/octet-stream',

          'Content-Length': String(content.length + 10),
        },
      });

    const tempDirectory: string = await mkdtemp(
      join(tmpdir(), 'osumi-tpv-remote-download-partial-'),
    );

    try {
      const destinationFile: string = join(tempDirectory, 'partial.otpv');

      const client = new HttpBackupRemoteClient('https://backup.test/api/v1', fetchImplementation);

      await expect(
        client.download('test-token', 'backup-public-id', destinationFile),
      ).rejects.toMatchObject({
        kind: 'temporary',
      });

      await expect(readFile(destinationFile)).rejects.toMatchObject({
        code: 'ENOENT',
      });
    } finally {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
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
