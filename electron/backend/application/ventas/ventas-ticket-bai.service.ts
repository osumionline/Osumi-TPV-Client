import type ConfigurationService from '@backend/application/configuration/configuration.service';
import VentaTicketBaiMapper from '@backend/application/ventas/venta-ticket-bai.mapper';
import type VentasTicketsService from '@backend/application/ventas/ventas-tickets.service';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import {
  TicketBaiClientError,
  type TicketBaiClientErrorKind,
} from '@backend/contracts/ticket-bai/ticket-bai-client.error';
import type {
  TicketBaiClient,
  TicketBaiCreateInvoiceRequest,
  TicketBaiCreateInvoiceResult,
} from '@backend/contracts/ticket-bai/ticket-bai-client.interface';
import type VentasTicketBaiRepository from '@backend/contracts/ventas/ventas-ticket-bai.repository.interface';
import type {
  VentaTicketBaiFailureEstado,
  VentaTicketBaiRecord,
} from '@backend/domain/ventas/venta-ticket-bai-record.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';
import type TicketBaiConfig from '@desktop-contracts/configuration/ticket-bai-config.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';

type ConfigurationLoader = Pick<ConfigurationService, 'load'>;

type SecretLoader = Pick<SecretStorage, 'load'>;

type VentaTicketReader = Pick<VentasTicketsService, 'getByVentaId'>;

export default class VentasTicketBaiService {
  constructor(
    private readonly configurationService: ConfigurationLoader,
    private readonly secretStorage: SecretLoader,
    private readonly ventasTicketsService: VentaTicketReader,
    private readonly mapper: VentaTicketBaiMapper,
    private readonly repository: VentasTicketBaiRepository,
    private readonly client: TicketBaiClient,
  ) {}

  /**
   * Procesa el primer intento TicketBAI de una venta
   * ya confirmada mediante COMMIT comercial.
   *
   * Nunca realiza reintentos automáticos sobre
   * estados fiscales que ya hayan finalizado.
   */
  async processInitial(idVenta: number): Promise<void> {
    this.validateVentaId(idVenta);

    const existing: VentaTicketBaiRecord | null = await this.repository.findByVentaId(idVenta);

    /*
     * Únicamente permitimos continuar una fila
     * pendiente. Cualquier otro estado demuestra que
     * el flujo inicial ya tomó una decisión.
     *
     * Esto incluye expresamente error/rechazo:
     * nunca hacemos retry automático.
     */
    if (existing !== null && existing.estado !== 'pendiente') {
      return;
    }

    const appData: AppData | null = await this.configurationService.load();

    if (appData === null) {
      throw new Error('No se ha podido obtener la configuración para TicketBAI.');
    }

    const ticketBaiConfig: TicketBaiConfig | null = appData.ticketBai;

    if (ticketBaiConfig === null) {
      if (existing !== null) {
        throw new Error(
          [
            'La venta tiene un envío TicketBAI pendiente,',
            'pero TicketBAI ya no está configurado.',
          ].join(' '),
        );
      }

      await this.repository.initializeNoAplica(idVenta);

      return;
    }

    const issuerNif: string = this.requireIssuerNif(ticketBaiConfig);

    const token: string = await this.requireToken();

    const ticket: VentaTicketInterface | null =
      await this.ventasTicketsService.getByVentaId(idVenta);

    if (ticket === null) {
      throw new Error('No se ha podido recuperar la venta para generar TicketBAI.');
    }

    /*
     * El mapper es también nuestra barrera
     * provisional frente a devoluciones y operaciones
     * mixtas, cuya semántica fiscal sigue bloqueada.
     */
    const request: TicketBaiCreateInvoiceRequest = this.mapper.map(ticket);

    const requestPayload: string = this.serializeRequest(request);

    const pending: VentaTicketBaiRecord = await this.repository.initializePending({
      idVenta,
      entorno: ticketBaiConfig.environment,
      nifEmisor: issuerNif,
      serie: request.serie,
      numero: request.numero,
      solicitudPayload: requestPayload,
    });

    /*
     * initializePending es idempotente. Si en una
     * carrera otro flujo ya avanzó la fila, no debemos
     * adquirir un segundo envío.
     */
    if (pending.estado !== 'pendiente') {
      return;
    }

    const attempt: VentaTicketBaiRecord | null = await this.repository.beginInitialAttempt(idVenta);

    if (attempt === null) {
      return;
    }

    let result: TicketBaiCreateInvoiceResult;

    try {
      result = await this.client.createInvoice(
        {
          token,
          issuerNif,
          environment: ticketBaiConfig.environment,
        },
        request,
      );
    } catch (error: unknown) {
      /*
       * Solo los errores normalizados por nuestra
       * frontera TicketBaiClient permiten afirmar
       * cómo debe finalizar el intento.
       *
       * Un error inesperado deja deliberadamente
       * "enviando" para reconciliarlo posteriormente,
       * porque no sabemos si el proveedor recibió
       * realmente la operación.
       */
      if (!(error instanceof TicketBaiClientError)) {
        throw error;
      }

      await this.repository.markFailure({
        idVenta,
        estado: this.mapFailureState(error.kind),
        ultimoError: error.message,
        respuestaPayload: error.responsePayload,
      });

      throw new Error(error.message, {
        cause: error,
      });
    }

    if (result.status === 'pending') {
      await this.repository.markRemotePending({
        idVenta,
        huella: result.huella,
        qr: result.qr,
        url: result.url,
        respuestaPayload: result.responsePayload,
      });

      return;
    }

    await this.repository.markAccepted({
      idVenta,
      huella: result.huella,
      qr: result.qr,
      url: result.url,
      respuestaPayload: result.responsePayload,
    });
  }

  /**
   * Valida el identificador interno de venta.
   */
  private validateVentaId(idVenta: number): void {
    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      throw new RangeError('El identificador de la venta no es válido.');
    }
  }

  /**
   * Obtiene y valida el NIF utilizado como
   * emisor ante TicketBaiWS.
   */
  private requireIssuerNif(configuration: TicketBaiConfig): string {
    const nif: string = configuration.nif?.trim() ?? '';

    if (nif.length === 0) {
      throw new Error('El NIF de TicketBAI no está configurado.');
    }

    return nif;
  }

  /**
   * Recupera el token exclusivamente desde
   * el almacenamiento operacional seguro.
   */
  private async requireToken(): Promise<string> {
    const secrets: InstallationSecretsData | null = await this.secretStorage.load();

    const token: string = secrets?.ticketBaiToken?.trim() ?? '';

    if (token.length === 0) {
      throw new Error('El token de TicketBAI no está configurado.');
    }

    return token;
  }

  /**
   * Convierte el request fiscal normalizado
   * en el snapshot persistido del intento.
   */
  private serializeRequest(request: TicketBaiCreateInvoiceRequest): string {
    try {
      return JSON.stringify(request);
    } catch (error: unknown) {
      throw new Error('No se ha podido serializar la solicitud TicketBAI.', {
        cause: error,
      });
    }
  }

  /**
   * Convierte la clasificación estable de nuestra
   * frontera en el estado persistente equivalente.
   */
  private mapFailureState(kind: TicketBaiClientErrorKind): VentaTicketBaiFailureEstado {
    switch (kind) {
      case 'rejected':
        return 'rechazada';

      case 'temporary':
        return 'error_temporal';

      case 'permanent':
        return 'error_permanente';
    }
  }
}
