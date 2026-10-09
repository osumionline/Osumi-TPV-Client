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
  lastDeleteLineaPublicId: string | null = null;
  lastDeleteReservaPublicId: string | null = null;

  deleteLineaResult: boolean = true;
  deleteReservaResult: boolean = true;

  deleteLineaError: Error | null = null;
  deleteReservaError: Error | null = null;

  /**
   * Implementación mínima de creación requerida por el contrato.
   */
  create(command: CrearReservaRecordCommand): Promise<string> {
    void command;

    return Promise.resolve('reserva-1');
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
