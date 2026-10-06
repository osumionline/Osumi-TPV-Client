import { BackupRemoteClientError } from '@backend/contracts/backup/backup-remote-client.error';
import type {
  BackupRemoteClient,
  BackupRemoteDownloadTransferResult,
  BackupRemoteSession,
} from '@backend/contracts/backup/backup-remote-client.interface';
import type BackupRemoteCredentialStorage from '@backend/contracts/backup/backup-remote-credential-storage.interface';
import type {
  BackupRemoteBackup,
  BackupRemoteConnection,
  BackupRemoteCredentials,
  BackupRemoteUploadResult,
} from '@desktop-contracts/backup/backup-remote.interface';

/**
 * Gestiona la conexión de la instalación
 * con el servicio remoto de TPV Backup.
 */
export default class BackupRemoteService {
  private static readonly SESSION_EXPIRY_SKEW_SECONDS = 30;
  private session: BackupRemoteSession | null = null;

  /**
   * Crea el servicio remoto de copias.
   *
   * now permite controlar el reloj exclusivamente
   * desde tests sin alterar la lógica productiva.
   */
  constructor(
    private readonly client: BackupRemoteClient,
    private readonly credentialStorage: BackupRemoteCredentialStorage,
    private readonly now: () => number = (): number => Math.floor(Date.now() / 1000),
  ) {}

  /**
   * Valida unas nuevas credenciales contra TPV Backup
   * y solo las persiste después de autenticar correctamente.
   */
  async configure(value: unknown): Promise<BackupRemoteConnection> {
    const normalizedCredentials: BackupRemoteCredentials = this.normalizeCredentials(value);
    const session: BackupRemoteSession = await this.client.authenticate(normalizedCredentials);

    await this.credentialStorage.save(normalizedCredentials);

    this.session = session;

    return this.createConnection(session);
  }

  /**
   * Obtiene el estado remoto actual.
   *
   * Si existen credenciales persistidas pero todavía
   * no hay sesión, realiza la autenticación necesaria.
   */
  async getConnection(): Promise<BackupRemoteConnection | null> {
    const credentials: BackupRemoteCredentials | null = await this.credentialStorage.load();

    if (credentials === null) {
      this.session = null;

      return null;
    }

    const session: BackupRemoteSession = await this.ensureSession(credentials);

    return this.createConnection(session);
  }

  /**
   * Obtiene el listado de copias remotas
   * pertenecientes a esta instalación.
   */
  async list(): Promise<readonly BackupRemoteBackup[]> {
    const credentials: BackupRemoteCredentials = await this.loadRequiredCredentials();

    const session: BackupRemoteSession = await this.ensureSession(credentials);

    try {
      return await this.client.list(session.token);
    } catch (error: unknown) {
      if (!this.isRejectedSession(error)) {
        throw error;
      }

      /*
       * El servidor valida credencial, instalación y suscripción
       * en cada petición. Por tanto un JWT todavía no caducado
       * puede dejar de ser válido administrativamente.
       *
       * Eliminamos únicamente la sesión en memoria y realizamos
       * una nueva autenticación con la credencial persistida.
       */
      this.session = null;

      const refreshedSession: BackupRemoteSession = await this.ensureSession(credentials);

      return this.client.list(refreshedSession.token);
    }
  }

  /**
   * Sube una copia local a TPV Backup.
   *
   * Si el JWT ha sido invalidado administrativamente,
   * se renueva una única vez antes de reintentar.
   */
  async upload(filePath: string, fileName: string): Promise<BackupRemoteUploadResult> {
    const credentials: BackupRemoteCredentials = await this.loadRequiredCredentials();

    const session: BackupRemoteSession = await this.ensureSession(credentials);

    this.assertUploadAllowed(session);

    try {
      return await this.client.upload(session.token, filePath, fileName);
    } catch (error: unknown) {
      if (!this.isRejectedSession(error)) {
        throw error;
      }

      this.session = null;

      const refreshedSession: BackupRemoteSession = await this.ensureSession(credentials);

      this.assertUploadAllowed(refreshedSession);

      return this.client.upload(refreshedSession.token, filePath, fileName);
    }
  }

  /**
   * Descarga una copia remota directamente
   * al fichero indicado por la capa de aplicación.
   *
   * Las suscripciones caducadas pueden descargar.
   */
  async download(
    publicId: string,
    destinationFile: string,
  ): Promise<BackupRemoteDownloadTransferResult> {
    const credentials: BackupRemoteCredentials = await this.loadRequiredCredentials();

    const session: BackupRemoteSession = await this.ensureSession(credentials);

    try {
      return await this.client.download(session.token, publicId, destinationFile);
    } catch (error: unknown) {
      if (!this.isRejectedSession(error)) {
        throw error;
      }

      this.session = null;

      const refreshedSession: BackupRemoteSession = await this.ensureSession(credentials);

      return this.client.download(refreshedSession.token, publicId, destinationFile);
    }
  }

  /**
   * Elimina una copia remota.
   *
   * Las suscripciones caducadas conservan
   * el derecho a eliminar sus copias existentes.
   */
  async delete(value: unknown): Promise<void> {
    const publicId: string = this.normalizePublicId(value);

    const credentials: BackupRemoteCredentials = await this.loadRequiredCredentials();

    const session: BackupRemoteSession = await this.ensureSession(credentials);

    try {
      await this.client.delete(session.token, publicId);
    } catch (error: unknown) {
      if (!this.isRejectedSession(error)) {
        throw error;
      }

      this.session = null;

      const refreshedSession: BackupRemoteSession = await this.ensureSession(credentials);

      await this.client.delete(refreshedSession.token, publicId);
    }
  }

  /**
   * Elimina la configuración remota local.
   *
   * El JWT en memoria solo se descarta después
   * de eliminar correctamente la credencial persistida.
   */
  async removeConfiguration(): Promise<void> {
    await this.credentialStorage.delete();

    this.session = null;
  }

  /**
   * Recupera las credenciales persistidas
   * o rechaza la operación si no están configuradas.
   */
  private async loadRequiredCredentials(): Promise<BackupRemoteCredentials> {
    const credentials: BackupRemoteCredentials | null = await this.credentialStorage.load();

    if (credentials === null) {
      throw new Error('La instalación no tiene configuradas las credenciales de TPV Backup.');
    }

    return credentials;
  }

  /**
   * Obtiene una sesión utilizable, reutilizando
   * la actual o autenticando de nuevo cuando sea necesario.
   */
  private async ensureSession(credentials: BackupRemoteCredentials): Promise<BackupRemoteSession> {
    if (this.session !== null && this.isSessionUsable(this.session)) {
      return this.session;
    }

    const session: BackupRemoteSession = await this.client.authenticate(credentials);

    this.session = session;

    return session;
  }

  /**
   * Determina si la sesión todavía dispone
   * de margen suficiente antes de su expiración.
   */
  private isSessionUsable(session: BackupRemoteSession): boolean {
    return session.expiresAt > this.now() + BackupRemoteService.SESSION_EXPIRY_SKEW_SECONDS;
  }

  /**
   * Impide iniciar una subida cuando la sesión
   * ya indica que la suscripción no lo permite.
   */
  private assertUploadAllowed(session: BackupRemoteSession): void {
    if (session.canUpload) {
      return;
    }

    throw new BackupRemoteClientError(
      'forbidden',
      'La suscripción de TPV Backup no permite subir nuevas copias.',
    );
  }

  /**
   * Identifica un rechazo del middleware remoto
   * que puede resolverse renovando la sesión.
   */
  private isRejectedSession(error: unknown): boolean {
    return error instanceof BackupRemoteClientError && error.kind === 'forbidden';
  }

  /**
   * Valida un identificador público recibido
   * desde una frontera no confiable.
   */
  private normalizePublicId(value: unknown): string {
    if (typeof value !== 'string') {
      throw new Error('El identificador de la copia remota no es válido.');
    }

    const publicId: string = value.trim();

    if (publicId === '') {
      throw new Error('El identificador de la copia remota no puede estar vacío.');
    }

    return publicId;
  }

  /**
   * Valida y normaliza las credenciales introducidas
   * sin alterar en ningún caso el secreto.
   */
  private normalizeCredentials(value: unknown): BackupRemoteCredentials {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
      throw new Error('Las credenciales de TPV Backup no son válidas.');
    }

    const data: Record<string, unknown> = value as Record<string, unknown>;
    const rawKeyId: unknown = data['keyId'];
    const secret: unknown = data['secret'];

    if (typeof rawKeyId !== 'string' || typeof secret !== 'string') {
      throw new Error('Las credenciales de TPV Backup no son válidas.');
    }

    const keyId: string = rawKeyId.trim();

    if (keyId === '' || secret === '') {
      throw new Error('Las credenciales de TPV Backup no pueden estar vacías.');
    }

    return {
      keyId,
      secret,
    };
  }

  /**
   * Elimina el token de la representación
   * que puede abandonar este servicio.
   */
  private createConnection(session: BackupRemoteSession): BackupRemoteConnection {
    return {
      expiresAt: session.expiresAt,
      installation: {
        ...session.installation,
      },
      subscription: {
        ...session.subscription,
      },
      canUpload: session.canUpload,
    };
  }
}
