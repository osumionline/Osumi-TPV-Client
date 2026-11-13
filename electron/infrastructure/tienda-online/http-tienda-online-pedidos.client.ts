import type TiendaOnlinePedidosClient from '@backend/contracts/tienda-online/tienda-online-pedidos.client.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type { InstallationSecretsData } from '@desktop-contracts/configuration/installation-command.interface';

const REQUEST_TIMEOUT_MS: number = 15_000;
const MAX_RESPONSE_LENGTH: number = 1_000_000;

/**
 * Implementación HTTP del protocolo de sincronización.
 *
 * Utiliza la URL y el secreto configurados para la tienda
 * conectada. No conoce la plataforma comercial concreta.
 */
export default class HttpTiendaOnlinePedidosClient implements TiendaOnlinePedidosClient {
  private readonly baseUrl: string;
  private readonly secret: string;

  constructor(
    urlApi: string,
    secretApi: string,
    private readonly fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  ) {
    this.baseUrl = this.normalizeUrl(urlApi);

    if (!/^[a-f0-9]{64}$/.test(secretApi)) {
      throw new Error('La credencial de sincronización no es válida.');
    }

    this.secret = secretApi;
  }

  /**
   * Construye el cliente desde la configuración real de la instalación.
   *
   * Reutiliza los ajustes existentes de tienda online y el
   * secreto protegido, sin introducir otra configuración.
   */
  static fromConfiguration(
    appData: Pick<AppData, 'ventaOnline' | 'urlApi'> | null,
    secrets: Pick<InstallationSecretsData, 'secretApi'> | null,
    fetchImplementation: typeof globalThis.fetch = globalThis.fetch,
  ): HttpTiendaOnlinePedidosClient {
    if (appData === null || !appData.ventaOnline) {
      throw new Error('La integración con la tienda online no está activada.');
    }

    if (secrets === null || secrets.secretApi === '') {
      throw new Error('No existe una credencial de sincronización configurada.');
    }

    return new HttpTiendaOnlinePedidosClient(
      appData.urlApi,
      secrets.secretApi,
      fetchImplementation,
    );
  }

  /**
   * Obtiene la siguiente página del protocolo.
   *
   * Devuelve unknown deliberadamente: la validación de
   * estructura y contenido pertenece al parser existente.
   */
  async pending(afterId: number): Promise<unknown> {
    if (!Number.isSafeInteger(afterId) || afterId < 0) {
      throw new Error('El cursor de sincronización no es válido.');
    }

    return this.request('/tpv/orders/pending', {
      afterId,
    });
  }

  /**
   * Solicita el ACK de un pedido y comprueba la confirmación
   * expresa del backend.
   *
   * No es un ACK automático: únicamente se ejecutará cuando
   * el futuro orquestador invoque este método.
   */
  async acknowledge(orderId: number): Promise<void> {
    if (!Number.isSafeInteger(orderId) || orderId <= 0) {
      throw new Error('El identificador de pedido para ACK no es válido.');
    }

    const payload: unknown = await this.request('/tpv/orders/ack', {
      id: orderId,
    });

    if (!this.isRecord(payload) || payload['status'] !== 'ok' || payload['acknowledged'] !== true) {
      throw new Error('La tienda online no ha confirmado la recepción del ACK.');
    }
  }

  /**
   * Ejecuta una petición JSON autenticada.
   *
   * No registra ni incorpora el secreto a los mensajes
   * de error. Los redirects están prohibidos para evitar
   * transferir la credencial a otro destino.
   */
  private async request(path: string, body: Readonly<Record<string, number>>): Promise<unknown> {
    let response: Response;

    try {
      response = await this.fetchImplementation(`${this.baseUrl}${path}`, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.secret}`,
        },
        body: JSON.stringify(body),
        cache: 'no-store',
        redirect: 'error',
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch {
      throw new Error('No se ha podido establecer la comunicación con la tienda online.');
    }

    if (!response.ok) {
      throw new Error(`La tienda online ha respondido con HTTP ${response.status}.`);
    }

    const contentLength: string | null = response.headers.get('content-length');

    if (contentLength !== null && Number(contentLength) > MAX_RESPONSE_LENGTH) {
      throw new Error('La respuesta de tienda online supera el tamaño permitido.');
    }

    let content: string;

    try {
      content = await response.text();
    } catch {
      throw new Error('No se ha podido leer la respuesta de tienda online.');
    }

    if (content.length > MAX_RESPONSE_LENGTH) {
      throw new Error('La respuesta de tienda online supera el tamaño permitido.');
    }

    try {
      return JSON.parse(content) as unknown;
    } catch {
      throw new Error('La tienda online no ha devuelto un documento JSON válido.');
    }
  }

  /**
   * Normaliza una URL base preservando cualquier prefijo de API.
   *
   * Se exige HTTPS excepto para conexiones locales de desarrollo.
   */
  private normalizeUrl(value: string): string {
    let url: URL;

    try {
      url = new URL(value);
    } catch {
      throw new Error('La URL de la tienda online no es válida.');
    }

    const loopback: boolean = ['localhost', '127.0.0.1', '[::1]'].includes(
      url.hostname.toLowerCase(),
    );

    if (
      !(url.protocol === 'https:' || (url.protocol === 'http:' && loopback)) ||
      url.username !== '' ||
      url.password !== '' ||
      url.search !== '' ||
      url.hash !== ''
    ) {
      throw new Error(
        'La URL de sincronización debe ser HTTPS y no incluir credenciales ni parámetros.',
      );
    }

    return url.toString().replace(/\/+$/, '');
  }

  /**
   * Comprueba que la respuesta recibida es un objeto JSON.
   */
  private isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
  }
}
