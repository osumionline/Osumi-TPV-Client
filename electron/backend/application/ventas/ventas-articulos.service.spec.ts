import VentasArticulosService from '@backend/application/ventas/ventas-articulos.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type VentasArticulosRepository from '@backend/contracts/ventas/ventas-articulos.repository.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type {
  AccesoDirectoVentaRecord,
  ArticuloVentaRecord,
} from '@backend/domain/ventas/articulo-venta-record.interface';
import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
import { beforeEach, describe, expect, it } from 'vitest';

describe('VentasArticulosService', (): void => {
  let repository: FakeVentasArticulosRepository;
  let applicationLogger: TestApplicationLogger;
  let service: VentasArticulosService;

  beforeEach((): void => {
    repository = new FakeVentasArticulosRepository();
    applicationLogger = new TestApplicationLogger();
    service = new VentasArticulosService(repository, applicationLogger);
  });

  it('resuelve un código numérico sin generar avisos', async (): Promise<void> => {
    repository.resolveResult = createArticuloRecord();

    const result: ArticuloVentaInterface | null = await service.resolveArticulo('  123  ');

    expect(repository.lastResolveCode).toBe('123');
    expect(repository.lastResolveNumericCode).toBe(123);

    expect(result).toEqual({
      id: 10,
      publicId: 'articulo-10',
      localizador: 123,
      nombre: 'Artículo',
      marca: 'Marca',
      pucMicros: 500_000,
      pvpCents: 125,
      pvpDescuentoCents: null,
      ivaBps: 2_100,
      stock: 4,
      fechaCaducidad: null,
      observaciones: null,
      mostrarObservacionesVentas: false,
    });

    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('trata un código vacío o no encontrado como resultado normal', async (): Promise<void> => {
    await expect(service.resolveArticulo('   ')).resolves.toBeNull();

    expect(repository.resolveCalls).toBe(0);

    repository.resolveResult = null;

    await expect(service.resolveArticulo('ABC-1')).resolves.toBeNull();

    expect(repository.resolveCalls).toBe(1);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra y propaga un fallo técnico al resolver un artículo', async (): Promise<void> => {
    const error: Error = new Error('SQLite article lookup failed.');

    repository.resolveError = error;

    await expect(service.resolveArticulo('ABC-1')).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'ventas',
        operation: 'resolve-sale-article',
        message: 'No se ha podido resolver un artículo para la venta.',
        error,
        context: {
          isNumericCode: false,
        },
      },
    ]);
  });

  it('normaliza una búsqueda y conserva cero resultados como estado normal', async (): Promise<void> => {
    repository.searchResult = [];

    const result: readonly ArticuloVentaInterface[] =
      await service.searchArticulos('  Café con leche  ');

    expect(repository.lastSearchPattern).toBe('%cafe%con%leche%');
    expect(result).toEqual([]);
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra y propaga un fallo técnico al buscar artículos', async (): Promise<void> => {
    const error: Error = new Error('SQLite article search failed.');

    repository.searchError = error;

    await expect(service.searchArticulos('Artículo')).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'ventas',
        operation: 'search-sale-articles',
        message: 'No se ha podido buscar artículos para la venta.',
        error,
        context: {
          hasQuery: true,
        },
      },
    ]);
  });

  it('devuelve los accesos directos disponibles sin generar avisos', async (): Promise<void> => {
    repository.directAccessResult = [
      {
        id: 10,
        publicId: 'articulo-10',
        accesoDirecto: 1,
        nombre: 'Artículo',
      },
    ];

    const result: readonly AccesoDirectoVentaInterface[] = await service.getAccesosDirectos();

    expect(result).toEqual([
      {
        id: 10,
        publicId: 'articulo-10',
        accesoDirecto: 1,
        nombre: 'Artículo',
      },
    ]);

    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra y propaga un fallo técnico al cargar los accesos directos', async (): Promise<void> => {
    const error: Error = new Error('SQLite direct access read failed.');

    repository.directAccessError = error;

    await expect(service.getAccesosDirectos()).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'ventas',
        operation: 'load-sale-direct-accesses',
        message: 'No se han podido cargar los accesos directos de venta.',
        error,
      },
    ]);
  });
});

/**
 * Logger controlado utilizado por los tests
 * de consulta de artículos de Ventas.
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
   * Conserva los avisos registrados por el servicio.
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

/**
 * Repository controlado utilizado para aislar
 * las consultas de artículos de Ventas.
 */
class FakeVentasArticulosRepository implements VentasArticulosRepository {
  resolveCalls: number = 0;

  lastResolveCode: string | null = null;
  lastResolveNumericCode: number | null = null;
  lastSearchPattern: string | null = null;

  resolveResult: ArticuloVentaRecord | null = null;
  searchResult: readonly ArticuloVentaRecord[] = [];
  directAccessResult: readonly AccesoDirectoVentaRecord[] = [];

  resolveError: Error | null = null;
  searchError: Error | null = null;
  directAccessError: Error | null = null;

  /**
   * Devuelve el resultado preparado para una resolución por código.
   */
  resolveByCode(
    codigo: string,
    codigoNumerico: number | null,
  ): Promise<ArticuloVentaRecord | null> {
    this.resolveCalls++;
    this.lastResolveCode = codigo;
    this.lastResolveNumericCode = codigoNumerico;

    if (this.resolveError !== null) {
      return Promise.reject(this.resolveError);
    }

    return Promise.resolve(this.resolveResult);
  }

  /**
   * Devuelve los resultados preparados para una búsqueda.
   */
  search(searchPattern: string): Promise<readonly ArticuloVentaRecord[]> {
    this.lastSearchPattern = searchPattern;

    if (this.searchError !== null) {
      return Promise.reject(this.searchError);
    }

    return Promise.resolve(this.searchResult);
  }

  /**
   * Devuelve los accesos directos preparados para la prueba.
   */
  getAccesosDirectos(): Promise<readonly AccesoDirectoVentaRecord[]> {
    if (this.directAccessError !== null) {
      return Promise.reject(this.directAccessError);
    }

    return Promise.resolve(this.directAccessResult);
  }
}

/**
 * Construye un artículo reutilizable para los tests.
 */
function createArticuloRecord(): ArticuloVentaRecord {
  return {
    id: 10,
    publicId: 'articulo-10',
    localizador: 123,
    nombre: 'Artículo',
    marca: 'Marca',
    pucMicros: 500_000,
    pvpCents: 125,
    pvpDescuentoCents: null,
    ivaBps: 2_100,
    stock: 4,
    fechaCaducidad: null,
    observaciones: null,
    mostrarObservacionesVentas: false,
  };
}
