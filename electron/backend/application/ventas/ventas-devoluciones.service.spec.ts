import VentasDevolucionesService from '@backend/application/ventas/ventas-devoluciones.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type VentasDevolucionesRepository from '@backend/contracts/ventas/ventas-devoluciones.repository.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type VentaDevolucionRecord from '@backend/domain/ventas/venta-devolucion-record.interface';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import { beforeEach, describe, expect, it } from 'vitest';

describe('VentasDevolucionesService', (): void => {
  let repository: FakeVentasDevolucionesRepository;
  let applicationLogger: TestApplicationLogger;
  let service: VentasDevolucionesService;

  beforeEach((): void => {
    repository = new FakeVentasDevolucionesRepository();
    applicationLogger = new TestApplicationLogger();

    service = new VentasDevolucionesService(repository, applicationLogger);
  });

  it('recupera la venta disponible para devolución sin generar errores', async (): Promise<void> => {
    repository.result = createVentaRecord();

    const result: VentaDevolucionInterface | null = await service.getByVentaId(15);

    expect(repository.lastVentaId).toBe(15);

    expect(result).toEqual({
      id: 15,
      publicId: 'venta-15',
      serie: '',
      numero: 15,
      fecha: '2026-10-09T10:00:00.000Z',
      cliente: null,
      totalCents: 2_000,
      pagos: [
        {
          nombre: 'Efectivo',
          importeCents: 2_000,
        },
      ],
      lineas: [
        {
          id: 100,
          publicId: 'linea-100',
          idArticulo: 10,
          articuloPublicId: 'articulo-10',
          localizador: 1234,
          nombre: 'Artículo',
          pucMicros: 500_000,
          pvpMicros: 1_000_000,
          ivaBps: 2_100,
          importeMicros: 2_000_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          unidades: 2,
          unidadesDevueltas: 0,
          unidadesDisponibles: 2,
          regalo: false,
        },
      ],
    });

    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('no registra como error técnico una venta inexistente', async (): Promise<void> => {
    repository.result = null;

    await expect(service.getByVentaId(15)).resolves.toBeNull();

    expect(repository.lastVentaId).toBe(15);
    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('rechaza un identificador inválido antes de acceder al repository', async (): Promise<void> => {
    await expect(service.getByVentaId(0)).rejects.toThrow(
      'El identificador de la venta no es válido.',
    );

    expect(repository.lastVentaId).toBeNull();
    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('registra y propaga un fallo técnico al recuperar la venta de origen', async (): Promise<void> => {
    const error: Error = new Error('SQLite return lookup failed.');

    repository.error = error;

    await expect(service.getByVentaId(15)).rejects.toBe(error);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'ventas',
        operation: 'load-return-source',
        message: 'No se ha podido recuperar la venta histórica para realizar una devolución.',
        error,
        context: {
          idVenta: 15,
        },
      },
    ]);
  });
});

/**
 * Logger controlado utilizado por los tests
 * de consulta de devoluciones.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly errorEvents: ApplicationLogEvent[] = [];

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
   * Ignora avisos.
   */
  warn(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los errores registrados por Devoluciones.
   */
  error(event: ApplicationLogEvent): void {
    this.errorEvents.push(event);
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
 * la consulta de ventas devolvibles.
 */
class FakeVentasDevolucionesRepository implements VentasDevolucionesRepository {
  lastVentaId: number | null = null;
  result: VentaDevolucionRecord | null = null;
  error: Error | null = null;

  /**
   * Devuelve el resultado preparado por cada prueba.
   */
  findByVentaId(idVenta: number): Promise<VentaDevolucionRecord | null> {
    this.lastVentaId = idVenta;

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.result);
  }
}

/**
 * Construye una venta histórica reutilizable
 * como origen de devolución.
 */
function createVentaRecord(): VentaDevolucionRecord {
  return {
    id: 15,
    publicId: 'venta-15',
    serie: '',
    numero: 15,
    fecha: '2026-10-09T10:00:00.000Z',
    cliente: null,
    totalCents: 2_000,
    pagos: [
      {
        nombre: 'Efectivo',
        importeCents: 2_000,
      },
    ],
    lineas: [
      {
        id: 100,
        publicId: 'linea-100',
        idArticulo: 10,
        articuloPublicId: 'articulo-10',
        localizador: 1234,
        nombre: 'Artículo',
        pucMicros: 500_000,
        pvpMicros: 1_000_000,
        ivaBps: 2_100,
        importeMicros: 2_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 2,
        unidadesDevueltas: 0,
        unidadesDisponibles: 2,
        regalo: false,
      },
    ],
  };
}
