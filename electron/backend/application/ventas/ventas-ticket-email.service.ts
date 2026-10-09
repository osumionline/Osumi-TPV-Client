import type ConfigurationService from '@backend/application/configuration/configuration.service';
import type VentasTicketsService from '@backend/application/ventas/ventas-tickets.service';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type {
  EmailSendRequest,
  EmailSender,
  EmailSenderSmtpConfig,
} from '@backend/contracts/email/email-sender.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type EmailSmtpConfig from '@desktop-contracts/configuration/email-smtp-config.interface';
import type EmailSmtpSecurity from '@desktop-contracts/configuration/email-smtp-security.type';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import { TICKET_EMAIL_TEMPLATE_VARIABLES } from '@desktop-contracts/configuration/ticket-email-config.interface';
import type { VentaTicketEmailCommand } from '@desktop-contracts/ventas/venta-ticket-email.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';

interface TicketEmailTemplateValues {
  readonly nombreNegocio: string;
  readonly referencia: string;
}

interface PreparedTicketEmailDocument {
  readonly ticket: VentaTicketInterface;
  readonly pdf: Uint8Array;
}

export default class VentasTicketEmailService {
  /**
   * Crea el servicio encargado del envío por email
   * de los tickets documentales ya persistidos.
   */
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly secretStorage: SecretStorage,
    private readonly ventasTicketsService: VentasTicketsService,
    private readonly emailSender: EmailSender,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  /**
   * Envía al destinatario indicado el PDF documental
   * vigente de una venta.
   *
   * Las validaciones conocidas de destinatario y configuración
   * no generan log. Las incidencias técnicas e inconsistencias
   * del documento se registran sin incluir datos del email.
   */
  async send(command: VentaTicketEmailCommand): Promise<void> {
    this.validateVentaId(command.idVenta);

    const destinatario: string = this.normalizeRecipient(command.destinatario);

    let appData: AppData | null;

    try {
      appData = await this.configurationService.load();
    } catch (error: unknown) {
      this.logPreparationFailure(command.idVenta, error);

      throw error;
    }

    if (appData === null) {
      throw new Error('No se ha podido recuperar la configuración de la aplicación.');
    }

    const smtp: EmailSenderSmtpConfig = await this.resolveSmtpConfig(
      appData.emailSmtp,
      command.idVenta,
    );

    const prepared: PreparedTicketEmailDocument = await this.prepareTicketDocument(command.idVenta);

    const referencia: string = this.formatTicketReference(prepared.ticket);

    const nombreNegocio: string = this.resolveBusinessName(appData);

    const templateValues: TicketEmailTemplateValues = {
      nombreNegocio,
      referencia,
    };

    const subject: string = this.renderTemplate(
      appData.ticketEmail.subjectTemplate,
      templateValues,
      'asunto',
    );

    const text: string = this.renderTemplate(
      appData.ticketEmail.bodyTemplate,
      templateValues,
      'cuerpo',
    );

    const request: EmailSendRequest = {
      smtp,

      fromName: nombreNegocio,
      fromAddress: smtp.user,

      to: destinatario,
      subject,
      text,

      attachments: [
        {
          filename: this.buildAttachmentFileName(referencia),

          contentType: 'application/pdf',
          content: prepared.pdf,
        },
      ],
    };

    try {
      await this.emailSender.send(request);
    } catch (error: unknown) {
      /*
       * No entregamos el error del proveedor directamente al logger.
       * El transporte podría contener información SMTP en implementaciones
       * distintas de la actual.
       */
      const safeError: Error = new Error(
        'El transporte SMTP no ha podido completar el envío del ticket.',
      );

      this.applicationLogger.warn({
        area: 'ventas',
        operation: 'send-ticket-email',
        message: 'No se ha podido enviar un ticket por email.',
        error: safeError,
        context: {
          idVenta: command.idVenta,
        },
      });

      throw error;
    }
  }

  /**
   * Recupera un snapshot documental estable junto con
   * el PDF vigente que se enviará como adjunto.
   *
   * Las desapariciones o cambios de revisión en esta fase
   * son inconsistencias recuperables y quedan registradas.
   */
  private async prepareTicketDocument(idVenta: number): Promise<PreparedTicketEmailDocument> {
    try {
      const ticketAntes: VentaTicketInterface | null =
        await this.ventasTicketsService.getByVentaId(idVenta);

      if (ticketAntes === null) {
        throw new Error('No se ha encontrado la venta cuyo ticket se quiere enviar.');
      }

      const pdf: Uint8Array | null = await this.ventasTicketsService.getCurrentPdf(idVenta);

      if (pdf === null) {
        throw new Error('El PDF vigente del ticket no está disponible.');
      }

      const ticketDespues: VentaTicketInterface | null =
        await this.ventasTicketsService.getByVentaId(idVenta);

      if (
        ticketDespues === null ||
        ticketDespues.ticketRevision !== ticketAntes.ticketRevision ||
        ticketDespues.ticketPdfRevision !== ticketDespues.ticketRevision
      ) {
        throw new Error('El ticket ha cambiado mientras se preparaba el email.');
      }

      return {
        ticket: ticketDespues,
        pdf,
      };
    } catch (error: unknown) {
      this.logPreparationFailure(idVenta, error);

      throw error;
    }
  }

  /**
   * Registra un fallo durante la preparación de un email
   * sin incorporar destinatario, configuración SMTP,
   * plantillas ni contenido documental.
   */
  private logPreparationFailure(idVenta: number, error: unknown): void {
    this.applicationLogger.warn({
      area: 'ventas',
      operation: 'prepare-ticket-email',
      message: 'No se ha podido preparar un ticket para enviarlo por email.',
      error,
      context: {
        idVenta,
      },
    });
  }

  /**
   * Obtiene y valida toda la configuración SMTP,
   * incluyendo la contraseña almacenada de forma segura.
   */
  private async resolveSmtpConfig(
    config: EmailSmtpConfig | null,
    idVenta: number,
  ): Promise<EmailSenderSmtpConfig> {
    if (config === null) {
      throw new Error('El envío de emails por SMTP no está configurado.');
    }

    const host: string = this.requireNonEmptyString(
      config.host,
      'El servidor SMTP no está configurado.',
    );

    const user: string = this.requireNonEmptyString(
      config.user,
      'El usuario SMTP no está configurado.',
    );

    if (
      config.port === null ||
      !Number.isSafeInteger(config.port) ||
      config.port < 1 ||
      config.port > 65_535
    ) {
      throw new Error('El puerto SMTP configurado no es válido.');
    }

    const security: EmailSmtpSecurity = this.normalizeSecurity(config.secure);

    let secrets: InstallationSecretsData | null;

    try {
      secrets = await this.secretStorage.load();
    } catch (error: unknown) {
      this.logPreparationFailure(idVenta, error);

      throw error;
    }

    const pass: string = this.requireNonEmptyString(
      secrets?.emailSmtpPass ?? null,
      'La contraseña SMTP no está disponible.',
    );

    return {
      host,
      port: config.port,
      security,
      user,
      pass,
    };
  }

  /**
   * Valida y normaliza el destinatario manual.
   */
  private normalizeRecipient(value: string): string {
    const recipient: string = value.trim();

    if (recipient.length === 0 || recipient.length > 320 || !/^[^\s@]+@[^\s@]+$/.test(recipient)) {
      throw new Error('La dirección de email del destinatario no es válida.');
    }

    return recipient;
  }

  /**
   * Normaliza la seguridad SMTP persistida.
   */
  private normalizeSecurity(value: string | null): EmailSmtpSecurity {
    switch (value) {
      case 'none':
      case 'tls':
      case 'ssl':
        return value;

      default:
        throw new Error('La seguridad SMTP configurada no es válida.');
    }
  }

  /**
   * Renderiza una plantilla sustituyendo únicamente
   * las variables admitidas por la configuración.
   */
  private renderTemplate(
    template: string,
    values: TicketEmailTemplateValues,
    fieldName: string,
  ): string {
    if (template.trim() === '') {
      throw new Error(`El ${fieldName} del email del ticket está vacío.`);
    }

    const variables: readonly string[] = template.match(/\{[^{}]+\}/g) ?? [];

    const unsupportedVariable: string | undefined = variables.find(
      (variable: string): boolean => !TICKET_EMAIL_TEMPLATE_VARIABLES.includes(variable),
    );

    if (unsupportedVariable !== undefined) {
      throw new Error(
        `La variable ${unsupportedVariable} no está permitida en el ${fieldName} del email.`,
      );
    }

    return template
      .replaceAll('{nombreNegocio}', values.nombreNegocio)
      .replaceAll('{referencia}', values.referencia);
  }

  /**
   * Construye la referencia documental utilizada
   * tanto en las plantillas como en el adjunto.
   */
  private formatTicketReference(ticket: VentaTicketInterface): string {
    const serie: string = ticket.serie.trim();

    return serie === '' ? String(ticket.numero) : `${serie}-${ticket.numero}`;
  }

  /**
   * Obtiene el nombre del negocio utilizado tanto
   * en las plantillas como en el remitente visible.
   */
  private resolveBusinessName(appData: AppData): string {
    const name: string = appData.nombre.trim();

    return name === '' ? 'Osumi TPV' : name;
  }

  /**
   * Genera un nombre de archivo seguro para el PDF adjunto.
   */
  private buildAttachmentFileName(referencia: string): string {
    const safeReference: string = referencia.replace(/[^a-zA-Z0-9._-]+/g, '_');

    return `ticket-${safeReference}.pdf`;
  }

  /**
   * Exige una cadena no vacía y devuelve su
   * representación normalizada.
   */
  private requireNonEmptyString(value: string | null, errorMessage: string): string {
    const normalized: string = value?.trim() ?? '';

    if (normalized === '') {
      throw new Error(errorMessage);
    }

    return normalized;
  }

  /**
   * Valida el identificador interno de la venta.
   */
  private validateVentaId(idVenta: number): void {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      throw new RangeError('El identificador de la venta no es válido.');
    }
  }
}
