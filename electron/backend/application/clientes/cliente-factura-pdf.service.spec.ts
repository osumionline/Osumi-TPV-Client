import ClienteFacturaPdfHtmlBuilder from '@backend/application/clientes/cliente-factura-pdf-html.builder';
import ClienteFacturaPdfService from '@backend/application/clientes/cliente-factura-pdf.service';
import type ClienteFacturaPdfStorage from '@backend/contracts/clientes/cliente-factura-pdf-storage.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type A4DocumentRenderer from '@backend/contracts/printing/a4-document-renderer.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type {
  ClienteFacturaDocumentoConsulta,
  ClienteFacturaDocumentoInterface,
} from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import { describe, expect, it } from 'vitest';

class FakeClienteFacturaDocumentoProvider {
  documento: ClienteFacturaDocumentoInterface = createDocumento();
  calls: number = 0;
  receivedConsulta: ClienteFacturaDocumentoConsulta | null = null;

  /**
   * Devuelve el documento configurado y registra
   * la consulta recibida.
   */
  getDocumento(
    consulta: ClienteFacturaDocumentoConsulta,
  ): Promise<ClienteFacturaDocumentoInterface> {
    this.calls += 1;
    this.receivedConsulta = consulta;

    return Promise.resolve(this.documento);
  }
}

class FakeA4DocumentRenderer implements A4DocumentRenderer {
  calls: number = 0;
  receivedHtml: string | null = null;
  result: Uint8Array = createPdf('rendered');
  error: Error | null = null;
  blocker: Promise<void> | null = null;
  onRenderStarted: (() => void) | null = null;

  /**
   * Simula el renderer permitiendo bloquear su
   * resolución para comprobar concurrencia.
   */
  async renderPdf(documentHtml: string): Promise<Uint8Array> {
    this.calls += 1;
    this.receivedHtml = documentHtml;
    this.onRenderStarted?.();

    if (this.blocker !== null) {
      await this.blocker;
    }

    if (this.error !== null) {
      throw this.error;
    }

    return this.result;
  }
}

class FakeClienteFacturaPdfStorage implements ClienteFacturaPdfStorage {
  storedPdf: Uint8Array | null = null;
  readCalls: number = 0;
  saveCalls: number = 0;
  receivedPublicId: string | null = null;

  /**
   * Devuelve los bytes actualmente fijados.
   */
  read(facturaPublicId: string): Promise<Uint8Array | null> {
    this.readCalls += 1;
    this.receivedPublicId = facturaPublicId;

    return Promise.resolve(this.storedPdf);
  }

  /**
   * Conserva únicamente los primeros bytes,
   * reproduciendo la semántica del storage real.
   */
  save(facturaPublicId: string, pdf: Uint8Array): Promise<void> {
    this.saveCalls += 1;
    this.receivedPublicId = facturaPublicId;

    if (this.storedPdf === null) {
      this.storedPdf = pdf;
    }

    return Promise.resolve();
  }
}

/**
 * Logger controlado utilizado por las pruebas
 * de materialización documental de facturas.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los avisos emitidos durante las pruebas.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores.
   */
  error(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * No existen escrituras pendientes
   * en este logger de memoria.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}

describe('ClienteFacturaPdfService', (): void => {
  it('devuelve directamente el PDF inmutable cuando ya existe', async (): Promise<void> => {
    const provider = new FakeClienteFacturaDocumentoProvider();
    const renderer = new FakeA4DocumentRenderer();
    const storage = new FakeClienteFacturaPdfStorage();
    const existingPdf: Uint8Array = createPdf('existing');

    storage.storedPdf = existingPdf;

    const service = createService(provider, renderer, storage);

    const result: Uint8Array = await service.getOrCreatePdf({
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-1',
    });

    expect(result).toEqual(existingPdf);
    expect(provider.calls).toBe(0);
    expect(renderer.calls).toBe(0);
    expect(storage.saveCalls).toBe(0);
  });

  it('materializa y devuelve el PDF cuando todavía no existe', async (): Promise<void> => {
    const provider = new FakeClienteFacturaDocumentoProvider();
    const renderer = new FakeA4DocumentRenderer();
    const storage = new FakeClienteFacturaPdfStorage();
    const service = createService(provider, renderer, storage);

    const result: Uint8Array = await service.getOrCreatePdf({
      clientePublicId: '  cliente-1  ',
      facturaPublicId: '  factura-1  ',
    });

    expect(provider.receivedConsulta).toEqual({
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-1',
    });
    expect(provider.calls).toBe(1);
    expect(renderer.calls).toBe(1);
    expect(renderer.receivedHtml).toContain('21_2026');
    expect(renderer.receivedHtml).toContain('PAGADO');
    expect(storage.saveCalls).toBe(1);
    expect(result).toEqual(renderer.result);
  });

  it('deduplica materializaciones simultáneas de la misma factura', async (): Promise<void> => {
    const provider = new FakeClienteFacturaDocumentoProvider();
    const renderer = new FakeA4DocumentRenderer();
    const storage = new FakeClienteFacturaPdfStorage();

    let releaseRenderer: () => void = (): void => {
      throw new Error('El desbloqueo del renderer no se ha inicializado.');
    };
    let notifyRendererStarted: () => void = (): void => {
      throw new Error('La notificación del renderer no se ha inicializado.');
    };

    renderer.blocker = new Promise<void>((resolve: () => void): void => {
      releaseRenderer = resolve;
    });

    const rendererStarted: Promise<void> = new Promise<void>((resolve: () => void): void => {
      notifyRendererStarted = resolve;
    });

    renderer.onRenderStarted = (): void => {
      notifyRendererStarted();
    };

    const service = createService(provider, renderer, storage);

    const consulta: ClienteFacturaDocumentoConsulta = {
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-1',
    };

    const firstRequest: Promise<Uint8Array> = service.getOrCreatePdf(consulta);

    await rendererStarted;

    const secondRequest: Promise<Uint8Array> = service.getOrCreatePdf(consulta);

    releaseRenderer();

    const [firstResult, secondResult]: readonly [Uint8Array, Uint8Array] = await Promise.all([
      firstRequest,
      secondRequest,
    ]);

    expect(provider.calls).toBe(1);
    expect(renderer.calls).toBe(1);
    expect(storage.saveCalls).toBe(1);
    expect(firstResult).toEqual(renderer.result);
    expect(secondResult).toEqual(renderer.result);
  });

  it('registra pero no propaga un fallo de materialización después de una emisión confirmada', async (): Promise<void> => {
    const provider = new FakeClienteFacturaDocumentoProvider();
    const renderer = new FakeA4DocumentRenderer();
    const storage = new FakeClienteFacturaPdfStorage();
    const applicationLogger = new TestApplicationLogger();
    const error: Error = new Error('Chromium no disponible');

    renderer.error = error;

    const service = createService(provider, renderer, storage, applicationLogger);

    await expect(
      service.materializeAfterEmit({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
      }),
    ).resolves.toBeUndefined();

    expect(storage.storedPdf).toBeNull();

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'clientes',
        operation: 'generate-invoice-pdf',
        message: 'No se ha podido generar o conservar el PDF definitivo de una factura.',
        error,
        context: {
          facturaPublicId: 'factura-1',
        },
      },
    ]);
  });

  it('registra y propaga un fallo al materializar el PDF bajo demanda', async (): Promise<void> => {
    const provider = new FakeClienteFacturaDocumentoProvider();
    const renderer = new FakeA4DocumentRenderer();
    const storage = new FakeClienteFacturaPdfStorage();
    const applicationLogger = new TestApplicationLogger();
    const error: Error = new Error('Filesystem no disponible');

    renderer.error = error;

    const service = createService(provider, renderer, storage, applicationLogger);

    await expect(
      service.getOrCreatePdf({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-1',
      }),
    ).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'clientes',
        operation: 'generate-invoice-pdf',
        message: 'No se ha podido generar o conservar el PDF definitivo de una factura.',
        error,
        context: {
          facturaPublicId: 'factura-1',
        },
      },
    ]);
  });

  it('no registra una consulta documental inválida como incidencia técnica', async (): Promise<void> => {
    const provider = new FakeClienteFacturaDocumentoProvider();
    const renderer = new FakeA4DocumentRenderer();
    const storage = new FakeClienteFacturaPdfStorage();
    const applicationLogger = new TestApplicationLogger();

    const service = createService(provider, renderer, storage, applicationLogger);

    await expect(
      service.getOrCreatePdf({
        clientePublicId: '',
        facturaPublicId: 'factura-1',
      }),
    ).rejects.toThrow('El identificador de cliente no es válido.');

    expect(applicationLogger.warnEvents).toEqual([]);
    expect(provider.calls).toBe(0);
    expect(renderer.calls).toBe(0);
    expect(storage.readCalls).toBe(0);
  });

  it('registra una sola vez el fallo de dos materializaciones simultáneas de la misma factura', async (): Promise<void> => {
    const provider = new FakeClienteFacturaDocumentoProvider();
    const renderer = new FakeA4DocumentRenderer();
    const storage = new FakeClienteFacturaPdfStorage();
    const applicationLogger = new TestApplicationLogger();
    const error: Error = new Error('Chromium no disponible');

    let releaseRenderer: () => void = (): void => {
      throw new Error('El desbloqueo del renderer no se ha inicializado.');
    };

    let notifyRendererStarted: () => void = (): void => {
      throw new Error('La notificación del renderer no se ha inicializado.');
    };

    renderer.blocker = new Promise<void>((resolve: () => void): void => {
      releaseRenderer = resolve;
    });

    const rendererStarted: Promise<void> = new Promise<void>((resolve: () => void): void => {
      notifyRendererStarted = resolve;
    });

    renderer.onRenderStarted = (): void => {
      notifyRendererStarted();
    };

    renderer.error = error;

    const service = createService(provider, renderer, storage, applicationLogger);

    const consulta: ClienteFacturaDocumentoConsulta = {
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-1',
    };

    const firstRequest: Promise<Uint8Array> = service.getOrCreatePdf(consulta);

    await rendererStarted;

    const secondRequest: Promise<Uint8Array> = service.getOrCreatePdf(consulta);

    releaseRenderer();

    await expect(firstRequest).rejects.toBe(error);
    await expect(secondRequest).rejects.toBe(error);

    expect(renderer.calls).toBe(1);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'clientes',
        operation: 'generate-invoice-pdf',
        message: 'No se ha podido generar o conservar el PDF definitivo de una factura.',
        error,
        context: {
          facturaPublicId: 'factura-1',
        },
      },
    ]);
  });
});

/**
 * Construye el servicio con dependencias controladas.
 */
function createService(
  provider: FakeClienteFacturaDocumentoProvider,
  renderer: A4DocumentRenderer,
  storage: ClienteFacturaPdfStorage,
  applicationLogger: ApplicationLogger = new TestApplicationLogger(),
): ClienteFacturaPdfService {
  return new ClienteFacturaPdfService(
    provider,
    new ClienteFacturaPdfHtmlBuilder(),
    renderer,
    storage,
    applicationLogger,
  );
}

/**
 * Crea unos bytes mínimos reconocibles como PDF.
 */
function createPdf(content: string): Uint8Array {
  return new TextEncoder().encode(`%PDF-1.7\n${content}`);
}

/**
 * Crea un documento finalizado representativo.
 */
function createDocumento(): ClienteFacturaDocumentoInterface {
  return {
    facturaPublicId: 'factura-1',
    serie: '',
    numero: 21,
    year: 2026,
    numeroFactura: '21_2026',
    estado: 'emitida',
    previsualizacion: false,
    generatedAt: '2026-09-06T10:00:00.000Z',
    fechaDocumento: '2026-09-06T10:00:00.000Z',
    fechaCreacion: '2026-09-05T09:00:00.000Z',
    fechaEmision: '2026-09-06T10:00:00.000Z',
    fechaAnulacion: null,
    emisor: {
      nombre: 'Empresa fiscal',
      nombreComercial: 'Mi tienda',
      cif: 'B12345678',
      telefono: '944000000',
      direccion: 'Gran Vía 1',
      poblacion: 'Bilbao',
      email: 'tienda@example.com',
      web: 'https://example.com',
    },
    cliente: {
      nombreApellidos: 'Cliente',
      dniCif: '12345678Z',
      telefono: null,
      email: null,
      direccion: 'Calle Cliente 1',
      codigoPostal: '48001',
      poblacion: 'Bilbao',
      provinciaId: 48,
    },
    ventas: [
      {
        publicId: 'venta-1',
        serie: '',
        numero: 101,
        fecha: '2026-09-05T10:00:00.000Z',
        pvpCents: 1_210,
        baseCents: 1_000,
        subtotalCents: 1_000,
        ivaCents: 210,
        descuentoCents: 0,
        totalCents: 1_210,
        lineas: [
          {
            localizador: 1001,
            marca: 'Marca',
            nombre: 'Artículo',
            pvpCents: 1_210,
            baseUnitCents: 1_000,
            unidades: 1,
            subtotalCents: 1_000,
            ivaBps: 2_100,
            ivaCents: 210,
            descuentoCents: 0,
            totalCents: 1_210,
            regalo: false,
          },
        ],
      },
    ],
    impuestos: [
      {
        ivaBps: 2_100,
        baseCents: 1_000,
        cuotaCents: 210,
        totalCents: 1_210,
      },
    ],
    subtotalCents: 1_000,
    descuentoCents: 0,
    totalCents: 1_210,
  };
}
