import type {
  EmailSendRequest,
  EmailSender,
  EmailSenderAttachment,
  EmailSenderSmtpConfig,
} from '@backend/contracts/email/email-sender.interface';
import { Buffer } from 'node:buffer';
import nodemailer, { type SendMailOptions } from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';

interface NodemailerTransport {
  sendMail(options: SendMailOptions): Promise<unknown>;

  close(): void;
}

type NodemailerTransportFactory = (options: SMTPTransport.Options) => NodemailerTransport;

/**
 * Crea el transporte SMTP real utilizado en producción.
 */
const defaultTransportFactory: NodemailerTransportFactory = (
  options: SMTPTransport.Options,
): NodemailerTransport => nodemailer.createTransport(options);

export default class NodemailerEmailSender implements EmailSender {
  constructor(
    private readonly transportFactory: NodemailerTransportFactory = defaultTransportFactory,
  ) {}

  /**
   * Envía un email SMTP sin permitir que Nodemailer
   * resuelva rutas locales ni URLs externas como contenido.
   */
  async send(request: EmailSendRequest): Promise<void> {
    const transport: NodemailerTransport = this.transportFactory(
      this.createTransportOptions(request.smtp),
    );

    try {
      const mailOptions: SendMailOptions = {
        from: {
          name: request.fromName,
          address: request.fromAddress,
        },

        to: request.to,
        subject: request.subject,
        text: request.text,

        attachments: request.attachments.map((attachment: EmailSenderAttachment) => ({
          filename: attachment.filename,

          contentType: attachment.contentType,

          content: Buffer.from(attachment.content),
        })),

        disableFileAccess: true,
        disableUrlAccess: true,
      };

      await transport.sendMail(mailOptions);
    } catch {
      /*
       * No propagamos el error original porque podría
       * incluir información de conexión SMTP.
       *
       * En particular, nunca debe poder llegar la
       * contraseña al renderer ni a un mensaje de UI.
       */
      throw new Error('No se ha podido enviar el email mediante el servidor SMTP configurado.');
    } finally {
      transport.close();
    }
  }

  /**
   * Traduce nuestra semántica none/tls/ssl
   * a las opciones concretas de Nodemailer.
   */
  private createTransportOptions(smtp: EmailSenderSmtpConfig): SMTPTransport.Options {
    const options: SMTPTransport.Options = {
      host: smtp.host,
      port: smtp.port,

      secure: smtp.security === 'ssl',

      auth: {
        user: smtp.user,
        pass: smtp.pass,
      },
    };

    if (smtp.security === 'tls') {
      options.requireTLS = true;
    }

    if (smtp.security === 'none') {
      options.ignoreTLS = true;
    }

    return options;
  }
}
