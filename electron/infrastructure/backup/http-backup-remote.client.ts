import {
  BackupRemoteClientError,
  type BackupRemoteClientErrorKind,
} from '@backend/contracts/backup/backup-remote-client.error';
import {
  BackupRemoteBackup,
  BackupRemoteCredentials,
  BackupRemoteSession,
  BackupRemoteSubscriptionStatus,
  type BackupRemoteClient,
} from '@backend/contracts/backup/backup-remote-client.interface';

interface JsonResponse {
  readonly response: Response;
  readonly payload: unknown;
}

/**
 * Cliente HTTP de la API remota de TPV Backup.
 */
export default class HttpBackupRemoteClient implements BackupRemoteClient {
  private readonly baseUrl: string;

  /**
   * Crea el cliente remoto.
   *
   * fetch puede inyectarse para tests e instrumentación.
   */
  constructor(
    baseUrl: string,
    private readonly fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
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
   * Ejecuta una petición JSON y normaliza
   * los errores HTTP, de red y de respuesta.
   */
  private async requestJson(url: string, init: RequestInit): Promise<JsonResponse> {
    let response: Response;

    try {
      response = await this.fetchImplementation(url, init);
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
