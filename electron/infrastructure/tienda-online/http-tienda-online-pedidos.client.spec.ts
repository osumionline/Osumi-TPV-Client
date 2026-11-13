import HttpTiendaOnlinePedidosClient from '@infrastructure/tienda-online/http-tienda-online-pedidos.client';
import { describe, expect, it } from 'vitest';

type FetchInput = Parameters<typeof globalThis.fetch>[0];

const TOKEN: string = 'a'.repeat(64);

/** Construye una respuesta HTTP JSON para las pruebas. */
function jsonResponse(payload: unknown, status: number = 200): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('HttpTiendaOnlinePedidosClient', (): void => {
  it('consulta pedidos usando POST, cursor y Bearer', async (): Promise<void> => {
    let capturedInput: FetchInput | null = null;
    let capturedInit: RequestInit | undefined;

    const mockFetch: typeof globalThis.fetch = async (
      input: FetchInput,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedInput = input;
      capturedInit = init;

      return jsonResponse({
        status: 'ok',
        version: 1,
        orders: [],
      });
    };

    const client = new HttpTiendaOnlinePedidosClient(
      'https://tienda.example/api/',
      TOKEN,
      mockFetch,
    );

    const response = await client.pending(25);

    expect(capturedInput).toBe('https://tienda.example/api/tpv/orders/pending');
    expect(capturedInit?.method).toBe('POST');
    expect(capturedInit?.redirect).toBe('error');
    expect(capturedInit?.cache).toBe('no-store');

    const headers = new Headers(capturedInit?.headers);

    expect(headers.get('Authorization')).toBe(`Bearer ${TOKEN}`);
    expect(headers.get('Content-Type')).toBe('application/json');
    expect(JSON.parse(String(capturedInit?.body))).toEqual({
      afterId: 25,
    });

    expect(response).toEqual({
      status: 'ok',
      version: 1,
      orders: [],
    });
  });

  it('permite un ACK únicamente con confirmación explícita', async (): Promise<void> => {
    let capturedBody: unknown = null;
    let capturedUrl: FetchInput | null = null;

    const mockFetch: typeof globalThis.fetch = async (
      input: FetchInput,
      init?: RequestInit,
    ): Promise<Response> => {
      capturedUrl = input;
      capturedBody = JSON.parse(String(init?.body)) as unknown;

      return jsonResponse({
        status: 'ok',
        acknowledged: true,
      });
    };

    const client = new HttpTiendaOnlinePedidosClient('https://tienda.example', TOKEN, mockFetch);

    await expect(client.acknowledge(123)).resolves.toBeUndefined();

    expect(capturedUrl).toBe('https://tienda.example/tpv/orders/ack');
    expect(capturedBody).toEqual({ id: 123 });
  });

  it('rechaza un ACK no confirmado', async (): Promise<void> => {
    const mockFetch: typeof globalThis.fetch = async (): Promise<Response> =>
      jsonResponse({
        status: 'error',
        acknowledged: false,
      });

    const client = new HttpTiendaOnlinePedidosClient('https://tienda.example', TOKEN, mockFetch);

    await expect(client.acknowledge(123)).rejects.toThrow('no ha confirmado la recepción del ACK');
  });

  it('rechaza errores HTTP sin incluir el secreto', async (): Promise<void> => {
    const mockFetch: typeof globalThis.fetch = async (): Promise<Response> =>
      jsonResponse({ status: 'error' }, 403);

    const client = new HttpTiendaOnlinePedidosClient('https://tienda.example', TOKEN, mockFetch);

    const error: unknown = await client.pending(0).catch((reason: unknown): unknown => reason);

    expect(error).toBeInstanceOf(Error);
    expect((error as Error).message).toContain('HTTP 403');
    expect((error as Error).message).not.toContain(TOKEN);
  });

  it('rechaza JSON incorrecto y fallos de conexión', async (): Promise<void> => {
    const invalidFetch: typeof globalThis.fetch = async (): Promise<Response> =>
      new Response('No es JSON', { status: 200 });

    const invalidClient = new HttpTiendaOnlinePedidosClient(
      'https://tienda.example',
      TOKEN,
      invalidFetch,
    );

    await expect(invalidClient.pending(0)).rejects.toThrow(
      'no ha devuelto un documento JSON válido',
    );

    const failingFetch: typeof globalThis.fetch = async (): Promise<Response> => {
      throw new Error('Error técnico');
    };

    const failingClient = new HttpTiendaOnlinePedidosClient(
      'https://tienda.example',
      TOKEN,
      failingFetch,
    );

    await expect(failingClient.pending(0)).rejects.toThrow(
      'No se ha podido establecer la comunicación',
    );
  });

  it('utiliza la configuración de tienda online', async (): Promise<void> => {
    let called: boolean = false;

    const mockFetch: typeof globalThis.fetch = async (): Promise<Response> => {
      called = true;
      return jsonResponse({
        status: 'ok',
        version: 1,
        orders: [],
      });
    };

    const client = HttpTiendaOnlinePedidosClient.fromConfiguration(
      {
        ventaOnline: true,
        urlApi: 'https://tienda.example/api',
      },
      { secretApi: TOKEN },
      mockFetch,
    );

    await client.pending(0);

    expect(called).toBe(true);

    expect((): void => {
      HttpTiendaOnlinePedidosClient.fromConfiguration(
        {
          ventaOnline: false,
          urlApi: 'https://tienda.example',
        },
        { secretApi: TOKEN },
      );
    }).toThrow('no está activada');
  });

  it('protege la credencial frente a URLs inseguras', (): void => {
    expect((): void => {
      new HttpTiendaOnlinePedidosClient('http://tienda.example', TOKEN);
    }).toThrow('debe ser HTTPS');

    expect((): void => {
      new HttpTiendaOnlinePedidosClient('https://usuario:pass@tienda.example', TOKEN);
    }).toThrow('debe ser HTTPS');

    expect((): void => {
      new HttpTiendaOnlinePedidosClient('https://tienda.example', 'token-invalido');
    }).toThrow('La credencial de sincronización');

    expect((): void => {
      new HttpTiendaOnlinePedidosClient('http://localhost:4500', TOKEN);
    }).not.toThrow();
  });

  it('rechaza cursores e identificadores incorrectos', async (): Promise<void> => {
    const client = new HttpTiendaOnlinePedidosClient('https://tienda.example', TOKEN);

    await expect(client.pending(-1)).rejects.toThrow('El cursor de sincronización no es válido.');

    await expect(client.acknowledge(0)).rejects.toThrow(
      'El identificador de pedido para ACK no es válido.',
    );
  });
});
