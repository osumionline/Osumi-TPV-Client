import type {
  EmailSendRequest,
  EmailSenderSmtpConfig,
} from '@backend/contracts/email/email-sender.interface';
import NodemailerEmailSender from '@infrastructure/email/nodemailer-email.sender';
import type { SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { describe, expect, it } from 'vitest';

describe('NodemailerEmailSender', (): void => {
  it('traduce tls a STARTTLS obligatorio', async (): Promise<void> => {
    const transport: FakeNodemailerTransport = new FakeNodemailerTransport();

    const captured: {
      options?: SMTPTransport.Options;
    } = {};

    const sender: NodemailerEmailSender = new NodemailerEmailSender(
      (options: SMTPTransport.Options): FakeNodemailerTransport => {
        captured.options = options;

        return transport;
      },
    );

    await sender.send(createRequest('tls'));

    const options: SMTPTransport.Options | undefined = captured.options;

    if (options === undefined) {
      throw new Error('No se han capturado las opciones SMTP.');
    }

    expect(options).toMatchObject({
      host: 'smtp.example.com',
      port: 587,
      secure: false,
      requireTLS: true,

      auth: {
        user: 'tienda@example.com',
        pass: 'smtp-password',
      },
    });

    expect(transport.messages).toHaveLength(1);

    expect(transport.messages[0]).toMatchObject({
      from: {
        name: 'Empresa',
        address: 'tienda@example.com',
      },

      to: 'cliente@example.com',

      subject: 'Empresa - Ticket A-123',

      text: 'Adjuntamos el ticket.',

      disableFileAccess: true,
      disableUrlAccess: true,
    });

    expect(transport.messages[0]?.attachments?.[0]?.filename).toBe('ticket-A-123.pdf');

    expect(transport.closeCalls).toBe(1);
  });

  it('traduce ssl a TLS implícito', async (): Promise<void> => {
    const transport: FakeNodemailerTransport = new FakeNodemailerTransport();

    const captured: {
      options?: SMTPTransport.Options;
    } = {};

    const sender: NodemailerEmailSender = new NodemailerEmailSender(
      (options: SMTPTransport.Options): FakeNodemailerTransport => {
        captured.options = options;

        return transport;
      },
    );

    await sender.send(createRequest('ssl'));

    const options: SMTPTransport.Options | undefined = captured.options;

    if (options === undefined) {
      throw new Error('No se han capturado las opciones SMTP.');
    }

    expect(options).toMatchObject({
      secure: true,
    });

    expect(options.requireTLS).toBeUndefined();

    expect(options.ignoreTLS).toBeUndefined();
  });

  it('impide STARTTLS cuando la seguridad es none', async (): Promise<void> => {
    const transport: FakeNodemailerTransport = new FakeNodemailerTransport();

    const captured: {
      options?: SMTPTransport.Options;
    } = {};

    const sender: NodemailerEmailSender = new NodemailerEmailSender(
      (options: SMTPTransport.Options): FakeNodemailerTransport => {
        captured.options = options;

        return transport;
      },
    );

    await sender.send(createRequest('none'));

    const options: SMTPTransport.Options | undefined = captured.options;

    if (options === undefined) {
      throw new Error('No se han capturado las opciones SMTP.');
    }

    expect(options).toMatchObject({
      secure: false,
      ignoreTLS: true,
    });

    expect(options.requireTLS).toBeUndefined();
  });

  it('no propaga información sensible de un error SMTP', async (): Promise<void> => {
    const transport: FakeNodemailerTransport = new FakeNodemailerTransport();

    transport.sendError = new Error('Falló password smtp-password');

    const sender: NodemailerEmailSender = new NodemailerEmailSender(
      (): FakeNodemailerTransport => transport,
    );

    await expect(sender.send(createRequest('tls'))).rejects.toThrow(
      'No se ha podido enviar el email mediante el servidor SMTP configurado.',
    );

    expect(transport.closeCalls).toBe(1);
  });
});

class FakeNodemailerTransport {
  readonly messages: SendMailOptions[] = [];

  sendError: Error | null = null;

  closeCalls: number = 0;

  /**
   * Registra un mensaje SMTP simulado.
   */
  sendMail(options: SendMailOptions): Promise<unknown> {
    this.messages.push(options);

    if (this.sendError !== null) {
      return Promise.reject(this.sendError);
    }

    return Promise.resolve({});
  }

  /**
   * Registra el cierre del transporte.
   */
  close(): void {
    this.closeCalls += 1;
  }
}

/**
 * Construye una solicitud SMTP completa para los tests.
 */
function createRequest(security: EmailSenderSmtpConfig['security']): EmailSendRequest {
  return {
    smtp: {
      host: 'smtp.example.com',
      port: 587,
      security,
      user: 'tienda@example.com',
      pass: 'smtp-password',
    },

    fromName: 'Empresa',
    fromAddress: 'tienda@example.com',

    to: 'cliente@example.com',

    subject: 'Empresa - Ticket A-123',

    text: 'Adjuntamos el ticket.',

    attachments: [
      {
        filename: 'ticket-A-123.pdf',

        contentType: 'application/pdf',

        content: new TextEncoder().encode('%PDF-1.7\nticket\n%%EOF'),
      },
    ],
  };
}
