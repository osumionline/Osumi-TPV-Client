import type EmailSmtpSecurity from '@desktop-contracts/configuration/email-smtp-security.type';

export interface EmailSenderSmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly security: EmailSmtpSecurity;
  readonly user: string;
  readonly pass: string;
}

export interface EmailSenderAttachment {
  readonly filename: string;
  readonly contentType: string;
  readonly content: Uint8Array;
}

export interface EmailSendRequest {
  readonly smtp: EmailSenderSmtpConfig;

  readonly fromName: string;
  readonly fromAddress: string;

  readonly to: string;
  readonly subject: string;
  readonly text: string;

  readonly attachments: readonly EmailSenderAttachment[];
}

export interface EmailSender {
  /**
   * Envía un mensaje usando exclusivamente
   * la configuración recibida para esta operación.
   */
  send(request: EmailSendRequest): Promise<void>;
}
