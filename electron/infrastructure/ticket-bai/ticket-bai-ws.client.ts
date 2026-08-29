import {
  TicketBaiClientError,
  type TicketBaiClientErrorKind,
} from '@backend/contracts/ticket-bai/ticket-bai-client.error';
import type {
  TicketBaiClient,
  TicketBaiClientConfiguration,
  TicketBaiCreateInvoiceRequest,
  TicketBaiCreateInvoiceResult,
  TicketBaiGetInvoiceResult,
  TicketBaiInvoiceLine,
  TicketBaiInvoiceReference,
} from '@backend/contracts/ticket-bai/ticket-bai-client.interface';
import {
  TicketBaiWsApiError,
  TicketBaiWsClient,
  TicketBaiWsConfigurationError,
  TicketBaiWsError,
  TicketBaiWsHttpError,
  TicketBaiWsNetworkError,
  TicketBaiWsResponseError,
  type TicketBaiWsClientOptions,
  type TicketBaiWsCreateInvoiceRequest,
} from '@osumi/ticketbaiws';

export default class TicketBaiWsTicketBaiClient implements TicketBaiClient {
  /**
   * Permite inyectar fetch únicamente para tests
   * o instrumentación de infraestructura.
   */
  constructor(private readonly fetchImplementation?: typeof globalThis.fetch) {}

  /**
   * Crea una factura TicketBAI utilizando exclusivamente
   * la API pública de @osumi/ticketbaiws.
   */
  async createInvoice(
    configuration: TicketBaiClientConfiguration,
    request: TicketBaiCreateInvoiceRequest,
  ): Promise<TicketBaiCreateInvoiceResult> {
    try {
      const client: TicketBaiWsClient = this.createClient(configuration);
      const sdkRequest: TicketBaiWsCreateInvoiceRequest = this.createSdkRequest(request);

      const response = await client.invoices.create(sdkRequest);

      const responsePayload: string = this.serializePayload(response);

      if (!('huella_tbai' in response.return)) {
        throw new TicketBaiClientError(
          'permanent',
          ['TicketBaiWS ha devuelto una respuesta', 'que no corresponde a TicketBAI.'].join(' '),
          responsePayload,
        );
      }

      return {
        status: response.result === 'PENDING' ? 'pending' : 'accepted',
        huella: response.return.huella_tbai,
        qr: response.return.qr,
        url: response.return.url,
        responsePayload,
      };
    } catch (error: unknown) {
      if (error instanceof TicketBaiClientError) {
        throw error;
      }

      throw this.mapError(error);
    }
  }

  /**
   * Consulta el estado remoto de una factura TicketBAI
   * sin recrearla ni modificar sus datos fiscales.
   */
  async getInvoice(
    configuration: TicketBaiClientConfiguration,
    reference: TicketBaiInvoiceReference,
  ): Promise<TicketBaiGetInvoiceResult> {
    try {
      const client: TicketBaiWsClient = this.createClient(configuration);
      const response = await client.invoices.get({
        serie: reference.serie,
        numero: reference.numero,
      });

      const responsePayload: string = this.serializePayload(response);

      if (!('huella_tbai' in response.return)) {
        throw new TicketBaiClientError(
          'permanent',
          ['TicketBaiWS ha devuelto una respuesta', 'que no corresponde a TicketBAI.'].join(' '),
          responsePayload,
        );
      }

      const status: TicketBaiGetInvoiceResult['status'] =
        response.return.status === 'OK'
          ? 'accepted'
          : response.return.status === 'PENDING'
            ? 'pending'
            : 'rejected';

      return {
        status,
        huella: response.return.huella_tbai,
        qr: response.return.qr,
        url: response.return.url,
        responsePayload,
      };
    } catch (error: unknown) {
      if (error instanceof TicketBaiClientError) {
        throw error;
      }

      throw this.mapError(error);
    }
  }

  /**
   * Construye el cliente SDK usando exclusivamente
   * la configuración operacional recibida.
   */
  private createClient(configuration: TicketBaiClientConfiguration): TicketBaiWsClient {
    const options: TicketBaiWsClientOptions = {
      token: configuration.token,
      issuerNif: configuration.issuerNif,
      environment: configuration.environment,
      ...(this.fetchImplementation === undefined
        ? {}
        : {
            fetch: this.fetchImplementation,
          }),
    };

    return new TicketBaiWsClient(options);
  }

  /**
   * Traduce el contrato interno al DTO público
   * utilizado por @osumi/ticketbaiws.
   */
  private createSdkRequest(
    request: TicketBaiCreateInvoiceRequest,
  ): TicketBaiWsCreateInvoiceRequest {
    return {
      fecha: request.fecha,
      hora: request.hora,
      simplificada: request.simplificada,
      serie: request.serie,
      numero: request.numero,
      rectificativa: request.rectificativa,
      retencion: request.retencion,
      modo_recargo_equivalencia: request.modoRecargoEquivalencia,

      lineas: request.lineas.map((linea: TicketBaiInvoiceLine) => ({
        descripcion: linea.descripcion,
        cantidad: linea.cantidad,
        importe_unitario: linea.importeUnitario,
        tipo_iva: linea.tipoIva,
        tipo_req: linea.tipoReq,
      })),

      total_factura: request.totalFactura,
    };
  }

  /**
   * Convierte los errores públicos del SDK en la
   * clasificación estable utilizada por la aplicación.
   */
  private mapError(error: unknown): TicketBaiClientError {
    if (error instanceof TicketBaiWsApiError) {
      return new TicketBaiClientError(
        'rejected',
        'TicketBaiWS ha rechazado el documento.',
        this.serializeNullablePayload(error.apiResponse),
        null,
        {
          cause: error,
        },
      );
    }

    if (error instanceof TicketBaiWsConfigurationError) {
      return new TicketBaiClientError(
        'permanent',
        'La configuración local de TicketBAI no es válida.',
        null,
        null,
        {
          cause: error,
        },
      );
    }

    if (error instanceof TicketBaiWsHttpError) {
      const kind: TicketBaiClientErrorKind = this.isTemporaryHttpStatus(error.status)
        ? 'temporary'
        : 'permanent';

      return new TicketBaiClientError(
        kind,
        'TicketBaiWS ha devuelto un error HTTP.',
        this.serializeNullablePayload(error.responseBody),
        error.status,
        {
          cause: error,
        },
      );
    }

    if (error instanceof TicketBaiWsNetworkError) {
      return new TicketBaiClientError(
        'temporary',
        ['No se ha podido confirmar el resultado', 'del envío a TicketBaiWS.'].join(' '),
        null,
        null,
        {
          cause: error,
        },
      );
    }

    if (error instanceof TicketBaiWsResponseError) {
      return new TicketBaiClientError(
        'temporary',
        ['TicketBaiWS ha devuelto una respuesta', 'que no se ha podido interpretar.'].join(' '),
        this.serializeNullablePayload(error.responseBody),
        null,
        {
          cause: error,
        },
      );
    }

    if (error instanceof TicketBaiWsError) {
      return new TicketBaiClientError(
        'permanent',
        'Se ha producido un error en el cliente TicketBAI.',
        null,
        null,
        {
          cause: error,
        },
      );
    }

    return new TicketBaiClientError(
      'permanent',
      'Se ha producido un error inesperado preparando TicketBAI.',
      null,
      null,
      error instanceof Error
        ? {
            cause: error,
          }
        : undefined,
    );
  }

  /**
   * Decide si un estado HTTP permite tratar
   * razonablemente el fallo como temporal.
   */
  private isTemporaryHttpStatus(status: number): boolean {
    return status === 408 || status === 425 || status === 429 || status >= 500;
  }

  /**
   * Serializa un payload que necesariamente
   * debe poder conservarse en persistencia.
   */
  private serializePayload(value: unknown): string {
    return this.serializeNullablePayload(value) ?? 'null';
  }

  /**
   * Serializa de forma defensiva una respuesta
   * externa sin asumir su estructura concreta.
   */
  private serializeNullablePayload(value: unknown): string | null {
    if (typeof value === 'string') {
      return value;
    }

    try {
      const serialized: string | undefined = JSON.stringify(value);

      return serialized ?? null;
    } catch {
      return null;
    }
  }
}
