import type ConfigurationService from '@backend/application/configuration/configuration.service';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type {
  EmailSendRequest,
  EmailSender,
  EmailSenderSmtpConfig,
} from '@backend/contracts/email/email-sender.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type {
  ClienteFacturaDocumentoConsulta,
  ClienteFacturaDocumentoInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type ClienteFacturaEmailCommand from '@desktop-contracts/clientes/cliente-factura-email-command.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type EmailSmtpConfig from '@desktop-contracts/configuration/email-smtp-config.interface';
import type EmailSmtpSecurity from '@desktop-contracts/configuration/email-smtp-security.type';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';

interface ClienteFacturaDocumentoProvider {
  /**
   * Recupera el modelo documental de una factura.
   */
  getDocumento(
    consulta: ClienteFacturaDocumentoConsulta,
  ): Promise<ClienteFacturaDocumentoInterface>;
}

interface ClienteFacturaPdfProvider {
  /**
   * Obtiene los bytes canónicos del PDF definitivo.
   */
  getOrCreatePdf(consulta: ClienteFacturaDocumentoConsulta): Promise<Uint8Array>;
}

export default class ClienteFacturaEmailService {
  /**
   * Crea el servicio encargado del envío por email
   * de las facturas documentales ya emitidas.
   */
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly secretStorage: SecretStorage,
    private readonly documentoProvider: ClienteFacturaDocumentoProvider,
    private readonly pdfProvider: ClienteFacturaPdfProvider,
    private readonly emailSender: EmailSender,
    private readonly applicationLogger: ApplicationLogger,
  ) {}

  /**
   * Envía exactamente el PDF definitivo e inmutable
   * de una factura emitida.
   *
   * Las validaciones conocidas no generan log.
   * Las incidencias técnicas de preparación y transporte
   * se registran sin incorporar datos del destinatario,
   * del cliente ni de la configuración SMTP.
   */
  async send(command: ClienteFacturaEmailCommand): Promise<void> {
    if (typeof command !== 'object' || command === null) {
      throw new Error('Los datos para enviar la factura no son válidos.');
    }

    const consulta: ClienteFacturaDocumentoConsulta = {
      clientePublicId: this.requirePublicId(command.clientePublicId, 'cliente'),
      facturaPublicId: this.requirePublicId(command.facturaPublicId, 'factura'),
    };

    const destinatario: string = this.normalizeRecipient(command.destinatario);

    let appData: AppData | null;

    try {
      appData = await this.configurationService.load();
    } catch (error: unknown) {
      this.logPreparationFailure(consulta.facturaPublicId, error);

      throw error;
    }

    if (appData === null) {
      throw new Error('No se ha podido recuperar la configuración de la aplicación.');
    }

    const smtp: EmailSenderSmtpConfig = await this.resolveSmtpConfig(
      appData.emailSmtp,
      consulta.facturaPublicId,
    );

    const documento: ClienteFacturaDocumentoInterface = await this.prepareDocumento(consulta);

    /*
     * ClienteFacturaPdfService registra cualquier incidencia
     * de generación, lectura o persistencia del PDF.
     * No la capturamos aquí para evitar duplicarla.
     */
    const pdf: Uint8Array = await this.pdfProvider.getOrCreatePdf(consulta);

    const nombreEmail: string = this.resolveEmailBusinessName(appData);
    const referencia: string = documento.numeroFactura;

    const request: EmailSendRequest = {
      smtp,
      fromName: nombreEmail,
      fromAddress: smtp.user,
      to: destinatario,
      subject: `${nombreEmail} - Factura ${referencia}`,
      text: `Adjuntamos la factura ${referencia} de ${nombreEmail}.`,
      attachments: [
        {
          filename: this.buildAttachmentFileName(referencia),
          contentType: 'application/pdf',
          content: pdf,
        },
      ],
    };

    try {
      await this.emailSender.send(request);
    } catch (error: unknown) {
      /*
       * El error entregado al logger es deliberadamente genérico.
       * Una implementación de EmailSender podría incorporar
       * destinatarios, credenciales o detalles SMTP en su error.
       */
      const safeError: Error = new Error(
        'El transporte SMTP no ha podido completar el envío de la factura.',
      );

      this.applicationLogger.warn({
        area: 'clientes',
        operation: 'send-invoice-email',
        message: 'No se ha podido enviar una factura por email.',
        error: safeError,
        context: {
          facturaPublicId: consulta.facturaPublicId,
        },
      });

      throw error;
    }
  }

  /**
   * Recupera y valida el documento que se utilizará
   * para preparar el email de una factura.
   *
   * Un estado que no permite envío es una precondición
   * de negocio y no genera log. Una identidad documental
   * incoherente sí se considera incidencia técnica.
   */
  private async prepareDocumento(
    consulta: ClienteFacturaDocumentoConsulta,
  ): Promise<ClienteFacturaDocumentoInterface> {
    let documento: ClienteFacturaDocumentoInterface;

    try {
      documento = await this.documentoProvider.getDocumento(consulta);
    } catch (error: unknown) {
      this.logPreparationFailure(consulta.facturaPublicId, error);

      throw error;
    }

    if (documento.facturaPublicId !== consulta.facturaPublicId) {
      const error: Error = new Error(
        'El documento recuperado no corresponde a la factura solicitada.',
      );

      this.logPreparationFailure(consulta.facturaPublicId, error);

      throw error;
    }

    if (documento.estado !== 'emitida' || documento.previsualizacion || documento.numero === null) {
      throw new Error('Solo se pueden enviar por email facturas emitidas.');
    }

    return documento;
  }

  /**
   * Obtiene y valida la configuración SMTP y
   * recupera su contraseña del almacén seguro.
   */
  private async resolveSmtpConfig(
    config: EmailSmtpConfig | null,
    facturaPublicId: string,
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
      this.logPreparationFailure(facturaPublicId, error);

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
   * Registra un fallo durante la preparación del email
   * utilizando únicamente la identidad técnica de la factura.
   */
  private logPreparationFailure(facturaPublicId: string, error: unknown): void {
    this.applicationLogger.warn({
      area: 'clientes',
      operation: 'prepare-invoice-email',
      message: 'No se ha podido preparar una factura para enviarla por email.',
      error,
      context: {
        facturaPublicId,
      },
    });
  }

  /**
   * Valida y normaliza el destinatario indicado
   * únicamente para este envío.
   */
  private normalizeRecipient(value: string): string {
    if (typeof value !== 'string') {
      throw new Error('La dirección de email del destinatario no es válida.');
    }

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
   * Obtiene el nombre utilizado en asunto y cuerpo
   * siguiendo el mismo criterio que los tickets.
   */
  private resolveEmailBusinessName(appData: AppData): string {
    const nombre: string = appData.nombre.trim();

    return nombre === '' ? 'Osumi TPV' : nombre;
  }

  /**
   * Genera un nombre seguro para el PDF adjunto.
   */
  private buildAttachmentFileName(referencia: string): string {
    const safeReference: string = referencia.replace(/[^a-zA-Z0-9._-]+/g, '_');

    return `factura-${safeReference}.pdf`;
  }

  /**
   * Normaliza un identificador público obligatorio.
   */
  private requirePublicId(value: string, entity: 'cliente' | 'factura'): string {
    if (typeof value !== 'string') {
      throw new Error(`El identificador de ${entity} no es válido.`);
    }

    const normalizedValue: string = value.trim();

    if (normalizedValue === '') {
      throw new Error(`El identificador de ${entity} no es válido.`);
    }

    return normalizedValue;
  }

  /**
   * Exige una cadena no vacía y devuelve
   * su representación normalizada.
   */
  private requireNonEmptyString(value: string | null, errorMessage: string): string {
    const normalizedValue: string = value?.trim() ?? '';

    if (normalizedValue === '') {
      throw new Error(errorMessage);
    }

    return normalizedValue;
  }
}
