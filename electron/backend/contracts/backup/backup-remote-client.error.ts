export type BackupRemoteClientErrorKind =
  | 'unauthorized'
  | 'forbidden'
  | 'not-found'
  | 'conflict'
  | 'too-large'
  | 'invalid-backup'
  | 'temporary'
  | 'invalid-response'
  | 'unexpected';

export class BackupRemoteClientError extends Error {
  /**
   * Crea un error normalizado del servicio remoto de TPV Backup.
   */
  constructor(
    public readonly kind: BackupRemoteClientErrorKind,
    message: string,
    public readonly httpStatus: number | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);

    this.name = 'BackupRemoteClientError';
  }
}
