import type ConfigurationService from '@backend/application/configuration/configuration.service';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type {
  EmailSendRequest,
  EmailSender,
  EmailSenderSmtpConfig,
} from '@backend/contracts/email/email-sender.interface';
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
  constructor(
    private readonly configurationService: ConfigurationService,
    private readonly secretStorage: SecretStorage,
    private readonly documentoProvider: ClienteFacturaDocumentoProvider,
    private readonly pdfProvider: ClienteFacturaPdfProvider,
    private readonly emailSender: EmailSender,
  ) {}

  /**
   * Envía exactamente el PDF definitivo e inmutable
   * de una factura emitida.
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

    const appData: AppData | null = await this.configurationService.load();

    if (appData === null) {
      throw new Error('No se ha podido recuperar la configuración de la aplicación.');
    }

    const smtp: EmailSenderSmtpConfig = await this.resolveSmtpConfig(appData.emailSmtp);

    const documento: ClienteFacturaDocumentoInterface =
      await this.documentoProvider.getDocumento(consulta);

    this.validateDocumento(documento, consulta.facturaPublicId);

    const pdf: Uint8Array = await this.pdfProvider.getOrCreatePdf(consulta);

    const nombreNegocio: string = this.resolveBusinessName(appData);
    const referencia: string = documento.numeroFactura;

    const request: EmailSendRequest = {
      smtp,
      fromName: nombreNegocio,
      fromAddress: smtp.user,
      to: destinatario,
      subject: `${nombreNegocio} - Factura ${referencia}`,
      text: `Adjuntamos la factura ${referencia} de ${nombreNegocio}.`,
      attachments: [
        {
          filename: this.buildAttachmentFileName(referencia),
          contentType: 'application/pdf',
          content: pdf,
        },
      ],
    };

    await this.emailSender.send(request);
  }

  /**
   * Valida que el documento corresponda a una
   * factura emitida y todavía activa.
   */
  private validateDocumento(
    documento: ClienteFacturaDocumentoInterface,
    facturaPublicId: string,
  ): void {
    if (documento.facturaPublicId !== facturaPublicId) {
      throw new Error('El documento recuperado no corresponde a la factura solicitada.');
    }

    if (documento.estado !== 'emitida' || documento.previsualizacion || documento.numero === null) {
      throw new Error('Solo se pueden enviar por email facturas emitidas.');
    }
  }

  /**
   * Obtiene y valida la configuración SMTP y
   * recupera su contraseña del almacén seguro.
   */
  private async resolveSmtpConfig(config: EmailSmtpConfig | null): Promise<EmailSenderSmtpConfig> {
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

    const secrets: InstallationSecretsData | null = await this.secretStorage.load();
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
   * Obtiene el nombre comercial visible utilizado
   * como remitente y en el contenido del email.
   */
  private resolveBusinessName(appData: AppData): string {
    const nombreComercial: string = appData.nombreComercial.trim();

    if (nombreComercial !== '') {
      return nombreComercial;
    }

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
