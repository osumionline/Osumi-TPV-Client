import {
  BackupRemoteClientError,
  type BackupRemoteClientErrorKind,
} from '@backend/contracts/backup/backup-remote-client.error';
import type {
  BackupRemoteClient,
  BackupRemoteDownloadTransferResult,
  BackupRemoteSession,
} from '@backend/contracts/backup/backup-remote-client.interface';
import { OTPV_V3_MAX_PACKAGE_SIZE_BYTES } from '@backend/domain/backup/otpv-v3.constants';
import type {
  BackupRemoteBackup,
  BackupRemoteCredentials,
  BackupRemoteSubscriptionStatus,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';
import { createHash } from 'node:crypto';
import { openAsBlob } from 'node:fs';
import { mkdir, open, rm, type FileHandle } from 'node:fs/promises';
import { dirname } from 'node:path';

interface JsonResponse {
  readonly response: Response;
  readonly payload: unknown;
}

interface OpenFileAsBlobOptions {
  readonly type?: string;
}

type OpenFileAsBlob = (path: string, options?: OpenFileAsBlobOptions) => Promise<Blob>;

/**
 * Cliente HTTP de la API remota de TPV Backup.
 */
export default class HttpBackupRemoteClient implements BackupRemoteClient {
  private readonly baseUrl: string;

  /**
   * Crea el cliente remoto.
   *
   * fetch y la apertura de ficheros pueden
   * inyectarse para tests e instrumentación.
   */
  constructor(
    baseUrl: string,
    private readonly fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
    private readonly openFileAsBlob: OpenFileAsBlob = (
      path: string,
      options?: OpenFileAsBlobOptions,
    ): Promise<Blob> => openAsBlob(path, options),
  ) {
    this.baseUrl = this.normalizeBaseUrl(baseUrl);
  }

  /**
   * Autentica una instalación mediante keyId + secret.
   */
  async authenticate(credentials: BackupRemoteCredentials): Promise<BackupRemoteSession> {
    const result: JsonResponse = await this.requestJson(`${this.baseUrl}/auth/token`, {
      method: 'POST',

      headers: {
        'Content-Type': 'application/json',
      },

      body: JSON.stringify({
        keyId: credentials.keyId,
        secret: credentials.secret,
      }),
    });

    if (!this.isSessionResponse(result.payload)) {
      throw new BackupRemoteClientError(
        'invalid-response',
        'TPV Backup ha devuelto una respuesta de autenticación no válida.',
        result.response.status,
      );
    }

    return {
      token: result.payload.token,
      expiresAt: result.payload.expiresAt,

      installation: {
        publicId: result.payload.installation.publicId,
        name: result.payload.installation.name,
      },

      subscription: {
        publicId: result.payload.subscription.publicId,
        name: result.payload.subscription.name,
        status: result.payload.subscription.status,
      },

      canUpload: result.payload.canUpload,
    };
  }

  /**
   * Obtiene las copias remotas de la instalación autenticada.
   */
  async list(token: string): Promise<readonly BackupRemoteBackup[]> {
    const result: JsonResponse = await this.requestJson(`${this.baseUrl}/backups`, {
      method: 'GET',

      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!this.isBackupListResponse(result.payload)) {
      throw new BackupRemoteClientError(
        'invalid-response',
        'TPV Backup ha devuelto un listado de copias no válido.',
        result.response.status,
      );
    }

    return result.payload.list.map((backup: BackupRemoteBackup): BackupRemoteBackup => ({
      ...backup,
    }));
  }

  /**
   * Sube una copia `.otpv` mediante multipart/form-data
   * utilizando un Blob respaldado por el fichero local.
   */
  async upload(
    token: string,
    filePath: string,
    fileName: string,
  ): Promise<BackupRemoteUploadResult> {
    let file: Blob;

    try {
      file = await this.openFileAsBlob(filePath, {
        type: 'application/octet-stream',
      });
    } catch (error: unknown) {
      throw new BackupRemoteClientError(
        'unexpected',
        'No se ha podido abrir la copia local para subirla a TPV Backup.',
        null,
        error instanceof Error
          ? {
              cause: error,
            }
          : undefined,
      );
    }

    const formData: FormData = new FormData();

    formData.set('file', file, fileName);

    const result: JsonResponse = await this.requestJson(`${this.baseUrl}/backups`, {
      method: 'POST',

      headers: {
        Authorization: `Bearer ${token}`,
      },

      body: formData,
    });

    if (!this.isUploadResponse(result.payload)) {
      throw new BackupRemoteClientError(
        'invalid-response',
        'TPV Backup ha devuelto una respuesta de subida no válida.',
        result.response.status,
      );
    }

    return {
      ...result.payload.backup,
    };
  }

  /**
   * Descarga una copia remota directamente a disco
   * calculando su SHA-256 durante la transferencia.
   */
  async download(
    token: string,
    publicId: string,
    destinationFile: string,
  ): Promise<BackupRemoteDownloadTransferResult> {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      throw new BackupRemoteClientError(
        'unexpected',
        'El identificador de la copia remota no es válido.',
      );
    }

    const response: Response = await this.request(
      `${this.baseUrl}/backups/${encodeURIComponent(normalizedPublicId)}/download`,
      {
        method: 'GET',

        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!response.ok) {
      let payload: unknown = null;

      try {
        payload = await response.json();
      } catch {
        /*
         * Si el servidor no devuelve JSON para el error,
         * utilizamos el mensaje normalizado por status.
         */
      }

      throw this.createHttpError(response.status, payload);
    }

    const expectedSize: number | null = this.getDownloadContentLength(response);

    if (response.body === null) {
      throw new BackupRemoteClientError(
        'invalid-response',
        'TPV Backup ha devuelto una descarga sin contenido.',
        response.status,
      );
    }

    await mkdir(dirname(destinationFile), {
      recursive: true,
    });

    let fileHandle: FileHandle | null = null;
    let completed: boolean = false;

    try {
      fileHandle = await open(destinationFile, 'wx', 0o600);

      const hash = createHash('sha256');
      const reader = response.body.getReader();

      let sizeBytes: number = 0;

      try {
        while (true) {
          const chunk = await reader.read();

          if (chunk.done) {
            break;
          }

          if (chunk.value.byteLength === 0) {
            continue;
          }

          sizeBytes += chunk.value.byteLength;

          if (sizeBytes > OTPV_V3_MAX_PACKAGE_SIZE_BYTES) {
            throw new BackupRemoteClientError(
              'too-large',
              'La copia descargada supera el tamaño máximo permitido.',
              response.status,
            );
          }

          if (expectedSize !== null && sizeBytes > expectedSize) {
            throw new BackupRemoteClientError(
              'temporary',
              'La descarga recibida no coincide con el tamaño anunciado por TPV Backup.',
              response.status,
            );
          }

          hash.update(chunk.value);

          await this.writeDownloadChunk(fileHandle, chunk.value);
        }
      } catch (error: unknown) {
        try {
          await reader.cancel();
        } catch {
          /*
           * No ocultamos el error original
           * si la cancelación del stream también falla.
           */
        }

        throw error;
      } finally {
        reader.releaseLock();
      }

      if (expectedSize !== null && sizeBytes !== expectedSize) {
        throw new BackupRemoteClientError(
          'temporary',
          'La descarga de TPV Backup ha quedado incompleta.',
          response.status,
        );
      }

      const result: BackupRemoteDownloadTransferResult = {
        sizeBytes,
        sha256: hash.digest('hex'),
      };

      await fileHandle.close();

      fileHandle = null;
      completed = true;

      return result;
    } catch (error: unknown) {
      if (error instanceof BackupRemoteClientError) {
        throw error;
      }

      throw new BackupRemoteClientError(
        'unexpected',
        'No se ha podido guardar la copia descargada desde TPV Backup.',
        response.status,
        error instanceof Error
          ? {
              cause: error,
            }
          : undefined,
      );
    } finally {
      if (fileHandle !== null) {
        try {
          await fileHandle.close();
        } catch (error: unknown) {
          console.error(
            'No se ha podido cerrar el fichero parcial descargado desde TPV Backup:',
            error,
          );
        }
      }

      if (!completed) {
        await this.removeDownloadSafely(destinationFile);
      }
    }
  }

  /**
   * Elimina una copia remota perteneciente
   * a la instalación autenticada.
   */
  async delete(token: string, publicId: string): Promise<void> {
    const normalizedPublicId: string = publicId.trim();

    if (normalizedPublicId === '') {
      throw new BackupRemoteClientError(
        'unexpected',
        'El identificador de la copia remota no es válido.',
      );
    }

    const result: JsonResponse = await this.requestJson(
      `${this.baseUrl}/backups/${encodeURIComponent(normalizedPublicId)}`,
      {
        method: 'DELETE',

        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    );

    if (!this.isDeleteResponse(result.payload) || result.payload.publicId !== normalizedPublicId) {
      throw new BackupRemoteClientError(
        'invalid-response',
        'TPV Backup ha devuelto una respuesta de borrado no válida.',
        result.response.status,
      );
    }
  }

  /**
   * Ejecuta una petición HTTP normalizando
   * exclusivamente los errores de transporte.
   */
  private async request(url: string, init: RequestInit): Promise<Response> {
    try {
      return await this.fetchImplementation(url, init);
    } catch (error: unknown) {
      throw new BackupRemoteClientError(
        'temporary',
        'No se ha podido conectar con TPV Backup.',
        null,
        error instanceof Error
          ? {
              cause: error,
            }
          : undefined,
      );
    }
  }

  /**
   * Ejecuta una petición JSON y normaliza
   * los errores HTTP, de red y de respuesta.
   */
  private async requestJson(url: string, init: RequestInit): Promise<JsonResponse> {
    const response: Response = await this.request(url, init);

    let payload: unknown;

    try {
      payload = await response.json();
    } catch (error: unknown) {
      throw new BackupRemoteClientError(
        'invalid-response',
        'TPV Backup ha devuelto una respuesta que no se ha podido interpretar.',
        response.status,
        error instanceof Error
          ? {
              cause: error,
            }
          : undefined,
      );
    }

    if (!response.ok) {
      throw this.createHttpError(response.status, payload);
    }

    return {
      response,
      payload,
    };
  }

  /**
   * Convierte un estado HTTP del API en un error estable
   * para la capa de aplicación.
   */
  private createHttpError(status: number, payload: unknown): BackupRemoteClientError {
    const kind: BackupRemoteClientErrorKind = this.resolveHttpErrorKind(status);

    return new BackupRemoteClientError(
      kind,
      this.getApiErrorMessage(payload) ?? this.getDefaultHttpErrorMessage(kind),
      status,
    );
  }

  /**
   * Clasifica un estado HTTP remoto.
   */
  private resolveHttpErrorKind(status: number): BackupRemoteClientErrorKind {
    if (status === 401) {
      return 'unauthorized';
    }

    if (status === 403) {
      return 'forbidden';
    }

    if (status === 404) {
      return 'not-found';
    }

    if (status === 409) {
      return 'conflict';
    }

    if (status === 413) {
      return 'too-large';
    }

    if (status === 422) {
      return 'invalid-backup';
    }

    if (status === 408 || status === 425 || status === 429 || status >= 500) {
      return 'temporary';
    }

    return 'unexpected';
  }

  /**
   * Obtiene un mensaje seguro devuelto por el API.
   */
  private getApiErrorMessage(payload: unknown): string | null {
    if (!this.isRecord(payload)) {
      return null;
    }

    const message: unknown = payload['message'];

    return typeof message === 'string' && message !== '' ? message : null;
  }

  /**
   * Genera el mensaje por defecto para un error HTTP.
   */
  private getDefaultHttpErrorMessage(kind: BackupRemoteClientErrorKind): string {
    switch (kind) {
      case 'unauthorized':
        return 'Las credenciales de TPV Backup no son válidas.';

      case 'forbidden':
        return 'TPV Backup no permite realizar esta operación.';

      case 'not-found':
        return 'La copia solicitada no existe.';

      case 'conflict':
        return 'La copia entra en conflicto con una copia existente.';

      case 'too-large':
        return 'La copia supera el tamaño permitido por TPV Backup.';

      case 'invalid-backup':
        return 'El archivo no es una copia OTPV válida.';

      case 'temporary':
        return 'TPV Backup no está disponible temporalmente.';

      default:
        return 'TPV Backup ha devuelto un error inesperado.';
    }
  }

  /**
   * Normaliza y valida la URL base del API.
   */
  private normalizeBaseUrl(value: string): string {
    const normalized: string = value.trim().replace(/\/+$/, '');

    let url: URL;

    try {
      url = new URL(normalized);
    } catch {
      throw new Error('La URL de TPV Backup no es válida.');
    }

    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
      throw new Error('La URL de TPV Backup debe utilizar HTTP o HTTPS.');
    }

    return normalized;
  }

  /**
   * Obtiene y valida el tamaño anunciado
   * para una descarga remota cuando está disponible.
   *
   * Content-Length es opcional porque una respuesta
   * HTTP servida por streaming puede no exponerlo.
   */
  private getDownloadContentLength(response: Response): number | null {
    const rawValue: string | null = response.headers.get('Content-Length');

    if (rawValue === null) {
      return null;
    }

    if (!/^\d+$/.test(rawValue)) {
      throw new BackupRemoteClientError(
        'invalid-response',
        'TPV Backup ha indicado un tamaño de descarga no válido.',
        response.status,
      );
    }

    const sizeBytes: number = Number(rawValue);

    if (!Number.isSafeInteger(sizeBytes) || sizeBytes <= 0) {
      throw new BackupRemoteClientError(
        'invalid-response',
        'TPV Backup ha indicado un tamaño de descarga no válido.',
        response.status,
      );
    }

    if (sizeBytes > OTPV_V3_MAX_PACKAGE_SIZE_BYTES) {
      throw new BackupRemoteClientError(
        'too-large',
        'La copia remota supera el tamaño máximo permitido.',
        response.status,
      );
    }

    return sizeBytes;
  }

  /**
   * Escribe completamente un chunk recibido
   * aunque el filesystem realice escrituras parciales.
   */
  private async writeDownloadChunk(fileHandle: FileHandle, chunk: Uint8Array): Promise<void> {
    let offset: number = 0;

    while (offset < chunk.byteLength) {
      const result = await fileHandle.write(chunk, offset, chunk.byteLength - offset);

      if (result.bytesWritten <= 0) {
        throw new Error('No se han podido escribir los datos descargados.');
      }

      offset += result.bytesWritten;
    }
  }

  /**
   * Elimina un fichero parcial de descarga
   * sin ocultar el error original.
   */
  private async removeDownloadSafely(filePath: string): Promise<void> {
    try {
      await rm(filePath, {
        force: true,
      });
    } catch (error: unknown) {
      console.error('No se ha podido eliminar una descarga parcial de TPV Backup:', error);
    }
  }

  /**
   * Comprueba la respuesta del endpoint de autenticación.
   */
  private isSessionResponse(value: unknown): value is {
    readonly status: 'ok';
    readonly token: string;
    readonly expiresAt: number;
    readonly installation: {
      readonly publicId: string;
      readonly name: string;
    };
    readonly subscription: {
      readonly publicId: string;
      readonly name: string;
      readonly status: BackupRemoteSubscriptionStatus;
    };
    readonly canUpload: boolean;
  } {
    if (!this.isRecord(value) || value['status'] !== 'ok') {
      return false;
    }

    const installation: unknown = value['installation'];
    const subscription: unknown = value['subscription'];

    return (
      typeof value['token'] === 'string' &&
      value['token'] !== '' &&
      typeof value['expiresAt'] === 'number' &&
      Number.isSafeInteger(value['expiresAt']) &&
      this.isRecord(installation) &&
      typeof installation['publicId'] === 'string' &&
      typeof installation['name'] === 'string' &&
      this.isRecord(subscription) &&
      typeof subscription['publicId'] === 'string' &&
      typeof subscription['name'] === 'string' &&
      this.isSubscriptionStatus(subscription['status']) &&
      typeof value['canUpload'] === 'boolean'
    );
  }

  /**
   * Comprueba la respuesta del listado remoto.
   */
  private isBackupListResponse(value: unknown): value is {
    readonly status: 'ok';
    readonly list: readonly BackupRemoteBackup[];
  } {
    if (!this.isRecord(value) || value['status'] !== 'ok' || !Array.isArray(value['list'])) {
      return false;
    }

    return value['list'].every((backup: unknown): backup is BackupRemoteBackup =>
      this.isRemoteBackup(backup),
    );
  }

  /**
   * Comprueba la respuesta de un borrado correcto.
   */
  private isDeleteResponse(value: unknown): value is {
    readonly status: 'ok';
    readonly publicId: string;
  } {
    if (!this.isRecord(value) || value['status'] !== 'ok') {
      return false;
    }

    return typeof value['publicId'] === 'string' && value['publicId'] !== '';
  }

  /**
   * Comprueba la respuesta de una subida correcta.
   */
  private isUploadResponse(value: unknown): value is {
    readonly status: 'ok';
    readonly backup: BackupRemoteUploadResult;
  } {
    if (!this.isRecord(value) || value['status'] !== 'ok') {
      return false;
    }

    return this.isRemoteUploadResult(value['backup']);
  }

  /**
   * Comprueba los metadatos devueltos
   * después de almacenar una copia.
   */
  private isRemoteUploadResult(value: unknown): value is BackupRemoteUploadResult {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['publicId'] === 'string' &&
      value['publicId'] !== '' &&
      typeof value['backupId'] === 'string' &&
      value['backupId'] !== '' &&
      typeof value['createdAtClient'] === 'string' &&
      value['createdAtClient'] !== '' &&
      typeof value['originalFilename'] === 'string' &&
      value['originalFilename'] !== '' &&
      typeof value['sizeBytes'] === 'number' &&
      Number.isSafeInteger(value['sizeBytes']) &&
      value['sizeBytes'] > 0 &&
      typeof value['sha256'] === 'string' &&
      /^[0-9a-f]{64}$/i.test(value['sha256'])
    );
  }

  /**
   * Comprueba la estructura de una copia remota.
   */
  private isRemoteBackup(value: unknown): value is BackupRemoteBackup {
    if (!this.isRecord(value)) {
      return false;
    }

    return (
      typeof value['publicId'] === 'string' &&
      typeof value['backupId'] === 'string' &&
      typeof value['createdAtClient'] === 'string' &&
      typeof value['formatVersion'] === 'number' &&
      Number.isSafeInteger(value['formatVersion']) &&
      typeof value['applicationVersion'] === 'string' &&
      typeof value['databaseSchemaVersion'] === 'number' &&
      Number.isSafeInteger(value['databaseSchemaVersion']) &&
      typeof value['originalFilename'] === 'string' &&
      typeof value['sizeBytes'] === 'number' &&
      Number.isSafeInteger(value['sizeBytes']) &&
      value['sizeBytes'] >= 0 &&
      typeof value['sha256'] === 'string' &&
      /^[0-9a-f]{64}$/i.test(value['sha256']) &&
      typeof value['createdAt'] === 'string'
    );
  }

  /**
   * Comprueba un estado de suscripción conocido.
   */
  private isSubscriptionStatus(value: unknown): value is BackupRemoteSubscriptionStatus {
    return value === 'active' || value === 'expired';
  }

  /**
   * Comprueba si un valor es un objeto indexable.
   */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
