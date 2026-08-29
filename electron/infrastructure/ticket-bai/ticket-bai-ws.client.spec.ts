import { TicketBaiClientError } from '@backend/contracts/ticket-bai/ticket-bai-client.error';
import type {
  TicketBaiClientConfiguration,
  TicketBaiCreateInvoiceRequest,
  TicketBaiCreateInvoiceResult,
} from '@backend/contracts/ticket-bai/ticket-bai-client.interface';
import TicketBaiWsTicketBaiClient from '@infrastructure/ticket-bai/ticket-bai-ws.client';
import { describe, expect, it } from 'vitest';

type FetchInput = Parameters<typeof globalThis.fetch>[0];

describe('TicketBaiWsTicketBaiClient', (): void => {
  it('envía el DTO mediante el SDK y normaliza una respuesta TicketBAI', async (): Promise<void> => {
    let capturedInput: FetchInput | null = null;

    let capturedInit: RequestInit | undefined;

    const fetchImplementation: typeof globalThis.fetch = async (
      input: FetchInput,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedInput = input;
      capturedInit = init;

      return new Response(
        JSON.stringify({
          result: 'OK',
          return: {
            huella_tbai: 'TBAI-HUELLA',
            qr: 'QR-BASE64',
            url: 'https://example.test/tbai',
          },
          msg: null,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    };

    const client = new TicketBaiWsTicketBaiClient(fetchImplementation);

    const result: TicketBaiCreateInvoiceResult = await client.createInvoice(
      createConfiguration(),
      createRequest(),
    );

    expect(result.status).toBe('accepted');
    expect(result.huella).toBe('TBAI-HUELLA');
    expect(result.qr).toBe('QR-BASE64');
    expect(result.url).toBe('https://example.test/tbai');
    expect(getInputUrl(capturedInput)).toContain('api-test.ticketbaiws.eus/tbai/');

    const headers: Headers = new Headers(capturedInit?.headers);

    expect(headers.get('Token')).toBe('test-token');
    expect(headers.get('Nif')).toBe('B12345678');

    const body: unknown = JSON.parse(String(capturedInit?.body));

    expect(body).toEqual({
      fecha: '27/08/2026',
      hora: '16:15:16',
      simplificada: true,
      serie: 'TPV01',
      numero: '000123',
      rectificativa: false,
      retencion: 0,
      modo_recargo_equivalencia: true,

      lineas: [
        {
          descripcion: 'Artículo',
          cantidad: 1,
          importe_unitario: 10,
          tipo_iva: 21,
          tipo_req: 0,
        },
      ],

      total_factura: 12.1,
    });
  });

  it('normaliza PENDING conservando el artefacto fiscal', async (): Promise<void> => {
    const fetchImplementation: typeof globalThis.fetch = async (): Promise<Response> => {
      return new Response(
        JSON.stringify({
          result: 'PENDING',
          return: {
            huella_tbai: 'TBAI-HUELLA-PENDING',
            qr: 'QR-BASE64-PENDING',
            url: 'https://example.test/tbai/pending',
          },
          msg: null,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );
    };

    const client = new TicketBaiWsTicketBaiClient(fetchImplementation);

    const result: TicketBaiCreateInvoiceResult = await client.createInvoice(
      createConfiguration(),
      createRequest(),
    );

    expect(result.status).toBe('pending');
    expect(result.huella).toBe('TBAI-HUELLA-PENDING');
    expect(result.qr).toBe('QR-BASE64-PENDING');
    expect(result.url).toBe('https://example.test/tbai/pending');
  });

  it('clasifica un rechazo del API como rejected', async (): Promise<void> => {
    const client = new TicketBaiWsTicketBaiClient(createApiErrorFetch());

    try {
      await client.createInvoice(createConfiguration(), createRequest());

      throw new Error('Se esperaba un rechazo TicketBAI.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(TicketBaiClientError);

      if (!(error instanceof TicketBaiClientError)) {
        return;
      }

      expect(error.kind).toBe('rejected');

      expect(error.responsePayload).not.toBeNull();
    }
  });

  it('clasifica un fallo de red como temporal', async (): Promise<void> => {
    const fetchImplementation: typeof globalThis.fetch = async (): Promise<Response> => {
      throw new Error('network unavailable');
    };

    const client = new TicketBaiWsTicketBaiClient(fetchImplementation);

    try {
      await client.createInvoice(createConfiguration(), createRequest());

      throw new Error('Se esperaba un error temporal.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(TicketBaiClientError);

      if (!(error instanceof TicketBaiClientError)) {
        return;
      }

      expect(error.kind).toBe('temporary');
    }
  });

  it('rechaza como permanente una respuesta Verifactu inesperada', async (): Promise<void> => {
    const fetchImplementation: typeof globalThis.fetch = async (): Promise<Response> =>
      new Response(
        JSON.stringify({
          result: 'OK',
          return: {
            huella: 'VERIFACTU-HUELLA',
            qr: 'QR',
            url: 'https://example.test/verifactu',
          },
          msg: null,
        }),
        {
          status: 200,
          headers: {
            'Content-Type': 'application/json',
          },
        },
      );

    const client = new TicketBaiWsTicketBaiClient(fetchImplementation);

    try {
      await client.createInvoice(createConfiguration(), createRequest());

      throw new Error('Se esperaba una respuesta no TicketBAI.');
    } catch (error: unknown) {
      expect(error).toBeInstanceOf(TicketBaiClientError);

      if (!(error instanceof TicketBaiClientError)) {
        return;
      }

      expect(error.kind).toBe('permanent');
    }
  });
});

/**
 * Construye la configuración utilizada
 * por los tests del adaptador.
 */
function createConfiguration(): TicketBaiClientConfiguration {
  return {
    token: 'test-token',
    issuerNif: 'B12345678',
    environment: 'test',
  };
}

/**
 * Construye un request TicketBAI interno
 * mínimo para probar la frontera del SDK.
 */
function createRequest(): TicketBaiCreateInvoiceRequest {
  return {
    fecha: '27/08/2026',
    hora: '16:15:16',
    simplificada: true,
    serie: 'TPV01',
    numero: '000123',
    rectificativa: false,
    retencion: 0,
    modoRecargoEquivalencia: true,
    lineas: [
      {
        descripcion: 'Artículo',
        cantidad: 1,
        importeUnitario: 10,
        tipoIva: 21,
        tipoReq: 0,
      },
    ],
    totalFactura: 12.1,
  };
}

/**
 * Crea un fetch que simula un rechazo
 * funcional del API TicketBaiWS.
 */
function createApiErrorFetch(): typeof globalThis.fetch {
  return async (): Promise<Response> =>
    new Response(
      JSON.stringify({
        result: 'ERROR',
        return: [],
        msg: 'Documento rechazado para pruebas.',
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );
}

/**
 * Obtiene una representación textual
 * de la URL recibida por fetch.
 */
function getInputUrl(input: FetchInput | null): string {
  if (input === null) {
    throw new Error('El adaptador no ha realizado ninguna petición.');
  }

  if (typeof input === 'string') {
    return input;
  }

  if (input instanceof URL) {
    return input.toString();
  }

  return input.url;
}
