import ReservasService from '@backend/application/reservas/reservas.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type CrearReservaRecordCommand from '@backend/contracts/reservas/crear-reserva-record-command.interface';
import type ReservasRepository from '@backend/contracts/reservas/reservas.repository.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type ReservaRecord from '@backend/domain/reservas/reserva-record.interface';
import { beforeEach, describe, expect, it } from 'vitest';

describe('ReservasService', (): void => {
  let repository: FakeReservasRepository;
  let applicationLogger: TestApplicationLogger;
  let service: ReservasService;

  beforeEach((): void => {
    repository = new FakeReservasRepository();
    applicationLogger = new TestApplicationLogger();
    service = new ReservasService(repository, applicationLogger);
  });

  it('elimina una línea sin registrar errores cuando persistencia termina correctamente', async (): Promise<void> => {
    await service.deleteLinea('  linea-1  ');

    expect(repository.lastDeleteLineaPublicId).toBe('linea-1');
    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('no registra como fallo técnico una línea inexistente o ya inactiva', async (): Promise<void> => {
    repository.deleteLineaResult = false;

    await expect(service.deleteLinea('linea-1')).rejects.toThrow(
      'La línea de reserva indicada no existe o ya no está activa.',
    );

    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('registra y propaga un fallo técnico al eliminar una línea de reserva', async (): Promise<void> => {
    const error: Error = new Error('SQLite delete line failed.');

    repository.deleteLineaError = error;

    await expect(service.deleteLinea('linea-1')).rejects.toBe(error);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'ventas',
        operation: 'delete-reservation-line',
        message: 'No se ha podido eliminar una línea de reserva.',
        error,
        context: {
          reservaLineaPublicId: 'linea-1',
        },
      },
    ]);
  });

  it('normaliza una reserva antes de persistirla sin generar errores', async (): Promise<void> => {
    const publicId: string = await service.create({
      clientePublicId: '  cliente-1  ',
      lineas: [
        {
          articuloPublicId: '  articulo-1  ',
          nombre: '  Folios  ',
          pucMicros: 500_000,
          pvpMicros: 1_250_000,
          ivaBps: 2_100,
          importeMicros: 2_500_000,
          descuentoBps: 0,
          importeDescuentoMicros: 0,
          unidades: 2,
        },
      ],
    });

    expect(publicId).toBe('reserva-1');

    expect(repository.lastCreateCommand).toEqual({
      clientePublicId: 'cliente-1',
      totalCents: 250,
      lineas: [
        {
          articuloPublicId: 'articulo-1',
          nombre: 'Folios',
          pucMicros: 500_000,
          pvpCents: 125,
          ivaBps: 2_100,
          importeCents: 250,
          descuentoBps: 0,
          importeDescuentoCents: 0,
          unidades: 2,
        },
      ],
    });

    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('registra y propaga un fallo técnico al persistir una reserva', async (): Promise<void> => {
    const error: Error = new Error('SQLite reservation insert failed.');

    repository.createError = error;

    await expect(
      service.create({
        clientePublicId: 'cliente-1',
        lineas: [
          {
            articuloPublicId: 'articulo-1',
            nombre: 'Folios',
            pucMicros: 500_000,
            pvpMicros: 1_250_000,
            ivaBps: 2_100,
            importeMicros: 1_250_000,
            descuentoBps: 0,
            importeDescuentoMicros: 0,
            unidades: 1,
          },
          {
            articuloPublicId: null,
            nombre: 'Varios',
            pucMicros: 0,
            pvpMicros: 500_000,
            ivaBps: 2_100,
            importeMicros: 500_000,
            descuentoBps: 0,
            importeDescuentoMicros: 0,
            unidades: 1,
          },
        ],
      }),
    ).rejects.toBe(error);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'ventas',
        operation: 'create-reservation',
        message: 'No se ha podido persistir una nueva reserva.',
        error,
        context: {
          lineCount: 2,
          articleLineCount: 1,
        },
      },
    ]);
  });

  it('no registra como fallo técnico una reserva rechazada durante la validación', async (): Promise<void> => {
    await expect(
      service.create({
        clientePublicId: 'cliente-1',
        lineas: [],
      }),
    ).rejects.toThrow('La reserva debe contener al menos una línea.');

    expect(repository.lastCreateCommand).toBeNull();
    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('cancela una reserva sin registrar errores cuando persistencia termina correctamente', async (): Promise<void> => {
    await service.deleteReserva('  reserva-1  ');

    expect(repository.lastDeleteReservaPublicId).toBe('reserva-1');
    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('no registra como fallo técnico una reserva inexistente o ya inactiva', async (): Promise<void> => {
    repository.deleteReservaResult = false;

    await expect(service.deleteReserva('reserva-1')).rejects.toThrow(
      'La reserva indicada no existe o ya no está activa.',
    );

    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('registra y propaga un fallo técnico al cancelar una reserva', async (): Promise<void> => {
    const error: Error = new Error('SQLite delete reservation failed.');

    repository.deleteReservaError = error;

    await expect(service.deleteReserva('reserva-1')).rejects.toBe(error);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'ventas',
        operation: 'delete-reservation',
        message: 'No se ha podido cancelar una reserva.',
        error,
        context: {
          reservaPublicId: 'reserva-1',
        },
      },
    ]);
  });

  it('rechaza un identificador inválido antes de acceder al repository', async (): Promise<void> => {
    await expect(service.deleteReserva('   ')).rejects.toThrow(
      'El identificador de la reserva no es válido.',
    );

    expect(repository.lastDeleteReservaPublicId).toBeNull();
    expect(applicationLogger.errorEvents).toEqual([]);
  });
});

/**
 * Logger controlado utilizado por los tests
 * de gestión de reservas.
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
   * Conserva los errores registrados por Reservas.
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
 * el comportamiento de ReservasService.
 */
class FakeReservasRepository implements ReservasRepository {
  lastCreateCommand: CrearReservaRecordCommand | null = null;
  createResult: string = 'reserva-1';
  createError: Error | null = null;

  lastDeleteLineaPublicId: string | null = null;
  lastDeleteReservaPublicId: string | null = null;

  deleteLineaResult: boolean = true;
  deleteReservaResult: boolean = true;

  deleteLineaError: Error | null = null;
  deleteReservaError: Error | null = null;

  /**
   * Registra la creación solicitada y permite
   * simular un fallo de persistencia.
   */
  create(command: CrearReservaRecordCommand): Promise<string> {
    this.lastCreateCommand = command;

    if (this.createError !== null) {
      return Promise.reject(this.createError);
    }

    return Promise.resolve(this.createResult);
  }

  /**
   * Implementación mínima de lectura requerida por el contrato.
   */
  findAllActive(): Promise<readonly ReservaRecord[]> {
    return Promise.resolve([]);
  }

  /**
   * Simula la eliminación de una línea.
   */
  deleteLinea(publicId: string): Promise<boolean> {
    this.lastDeleteLineaPublicId = publicId;

    if (this.deleteLineaError !== null) {
      return Promise.reject(this.deleteLineaError);
    }

    return Promise.resolve(this.deleteLineaResult);
  }

  /**
   * Simula la cancelación de una reserva.
   */
  deleteReserva(publicId: string): Promise<boolean> {
    this.lastDeleteReservaPublicId = publicId;

    if (this.deleteReservaError !== null) {
      return Promise.reject(this.deleteReservaError);
    }

    return Promise.resolve(this.deleteReservaResult);
  }
}
