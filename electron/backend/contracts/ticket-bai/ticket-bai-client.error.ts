export type TicketBaiClientErrorKind = 'rejected' | 'temporary' | 'permanent';

export class TicketBaiClientError extends Error {
  override readonly name: string = 'TicketBaiClientError';

  /**
   * Construye un error TicketBAI normalizado para
   * que la aplicación no dependa de errores del SDK.
   */
  constructor(
    readonly kind: TicketBaiClientErrorKind,
    message: string,
    readonly responsePayload: string | null = null,
    readonly httpStatus: number | null = null,
    options?: ErrorOptions,
  ) {
    super(message, options);
  }
}
