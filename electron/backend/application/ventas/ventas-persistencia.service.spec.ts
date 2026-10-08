import VentasPersistenciaService from '@backend/application/ventas/ventas-persistencia.service';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { GuardarVentaRecordCommand } from '@backend/contracts/ventas/guardar-venta-record-command.interface';
import type VentasPersistenciaRepository from '@backend/contracts/ventas/ventas-persistencia.repository.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type VentaPersistidaRecord from '@backend/domain/ventas/venta-persistida-record.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import { beforeEach, describe, expect, it } from 'vitest';

let repository: TestVentasPersistenciaRepository;
let applicationLogger: TestApplicationLogger;
let service: VentasPersistenciaService;

describe('VentasPersistenciaService logging', (): void => {
  beforeEach((): void => {
    repository = new TestVentasPersistenciaRepository();
    applicationLogger = new TestApplicationLogger();

    service = new VentasPersistenciaService(repository, applicationLogger);
  });

  it('persiste una venta válida sin registrar errores', async (): Promise<void> => {
    const result: VentaPersistidaRecord = await service.save(createValidCommand());

    expect(result).toEqual({
      id: 123,
      publicId: 'venta-public-id',
      serie: '',
      numero: 456,
      totalCents: 1_000,
      fecha: '2026-10-08T20:00:00.000Z',
    });

    expect(repository.commands).toHaveLength(1);
    expect(applicationLogger.errorEvents).toEqual([]);
  });

  it('registra y vuelve a propagar un fallo de persistencia', async (): Promise<void> => {
    const persistenceError: Error = new Error('SQLite write failed.');

    repository.error = persistenceError;

    await expect(service.save(createValidCommand())).rejects.toBe(persistenceError);

    expect(applicationLogger.errorEvents).toEqual([
      {
        area: 'ventas',
        operation: 'persist-sale',
        message: 'No se ha podido persistir definitivamente la venta.',
        error: persistenceError,
        context: {
          ventaPublicId: 'venta-public-id',
          cajaPublicId: 'caja-public-id',
          lineCount: 1,
          paymentCount: 1,
          hasClient: false,
          hasReturn: false,
          reservationCount: 0,
        },
      },
    ]);
  });

  it('no registra como error técnico una venta rechazada durante la validación', async (): Promise<void> => {
    const command: GuardarVentaCommand = {
      ...createValidCommand(),
      lineas: [],
    };

    await expect(service.save(command)).rejects.toThrow(
      'La venta debe contener al menos una línea.',
    );

    expect(repository.commands).toHaveLength(0);
    expect(applicationLogger.errorEvents).toEqual([]);
  });
});

/**
 * Repositorio controlado utilizado para comprobar
 * la frontera real de persistencia.
 */
class TestVentasPersistenciaRepository implements VentasPersistenciaRepository {
  readonly commands: GuardarVentaRecordCommand[] = [];

  error: Error | null = null;

  /**
   * Conserva el comando recibido y devuelve
   * una venta persistida simulada.
   */
  save(
    command: Parameters<VentasPersistenciaRepository['save']>[0],
  ): Promise<VentaPersistidaRecord> {
    this.commands.push(command);

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve({
      id: 123,
      publicId: command.publicId,
      serie: '',
      numero: 456,
      totalCents: command.totalCents,
      fecha: '2026-10-08T20:00:00.000Z',
    });
  }
}

/**
 * Logger controlado utilizado por los tests
 * de persistencia de ventas.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly errorEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico no relevantes
   * para estos tests.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas no relevantes
   * para estos tests.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora avisos no relevantes
   * para estos tests.
   */
  warn(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los errores solicitados por el servicio.
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
 * Construye una venta mínima válida para alcanzar
 * la frontera real de persistencia del repositorio.
 */
function createValidCommand(): GuardarVentaCommand {
  return {
    publicId: 'venta-public-id',
    cajaPublicId: 'caja-public-id',
    empleadoPublicId: 'empleado-public-id',
    clientePublicId: null,
    devolucionVentaOrigenPublicId: null,
    reservasOrigenPublicIds: [],
    totalCents: 1_000,
    lineas: [
      {
        articuloPublicId: 'articulo-public-id',
        localizador: 100,
        marca: 'Marca',
        nombre: 'Artículo',
        pucMicros: 5_000_000,
        pvpMicros: 10_000_000,
        ivaBps: 2_100,
        importeMicros: 10_000_000,
        descuentoBps: 0,
        importeDescuentoMicros: 0,
        unidades: 1,
        regalo: false,
        devolucionLineaOrigenPublicId: null,
        reservaLineaOrigenPublicId: null,
      },
    ],
    pagos: [
      {
        tipoPagoPublicId: 'efectivo-public-id',
        importeCents: 1_000,
        entregadoCents: 1_000,
        cambioCents: 0,
      },
    ],
  };
}
