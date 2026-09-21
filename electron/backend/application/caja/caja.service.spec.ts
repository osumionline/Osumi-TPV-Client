import CajaService from '@backend/application/caja/caja.service';
import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type { CajaCierreRecord } from '@backend/domain/caja/caja-cierre-record.interface';
import type SalidaCajaRecord from '@backend/domain/caja/salida-caja-record.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import { type SalidaCajaInterface } from '@desktop-contracts/caja/salida-caja.interface';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

const ORIGINAL_TIMEZONE: string | undefined = process.env['TZ'];

let repository: FakeCajaRepository;
let service: CajaService;

describe('CajaService', (): void => {
  beforeEach((): void => {
    process.env['TZ'] = 'Europe/Madrid';

    repository = new FakeCajaRepository();
    service = new CajaService(repository);
  });

  afterEach((): void => {
    if (ORIGINAL_TIMEZONE === undefined) {
      delete process.env['TZ'];

      return;
    }

    process.env['TZ'] = ORIGINAL_TIMEZONE;
  });

  it('convierte un día civil al intervalo UTC del terminal', async (): Promise<void> => {
    await service.findSalidas({
      desde: '2026-09-21',
      hasta: '2026-09-21',
    });

    expect(repository.lastDesde).toBe('2026-09-20T22:00:00.000Z');
    expect(repository.lastHastaExclusive).toBe('2026-09-21T22:00:00.000Z');
  });

  it('mantiene los datos y la editabilidad calculada por persistencia', async (): Promise<void> => {
    repository.salidas = [
      {
        publicId: 'salida-abierta',
        concepto: 'Folios',
        descripcion: 'Compra de material',
        importeCents: 1_250,
        fecha: '2026-09-21T09:30:00.000Z',
        editable: true,
      },
      {
        publicId: 'salida-cerrada',
        concepto: 'Repartidor',
        descripcion: null,
        importeCents: 2_000,
        fecha: '2026-09-20T17:00:00.000Z',
        editable: false,
      },
    ];

    const result: readonly SalidaCajaInterface[] = await service.findSalidas({
      desde: '2026-09-20',
      hasta: '2026-09-21',
    });

    expect(result).toEqual(repository.salidas);
  });

  it('rechaza fechas inválidas y rangos invertidos', async (): Promise<void> => {
    await expect(
      service.findSalidas({
        desde: '2026-02-30',
        hasta: '2026-03-01',
      }),
    ).rejects.toThrow('La fecha inicial de las salidas de caja no es válida.');

    await expect(
      service.findSalidas({
        desde: '2026-09-22',
        hasta: '2026-09-21',
      }),
    ).rejects.toThrow(
      'La fecha inicial de las salidas de caja no puede ser posterior a la fecha final.',
    );

    expect(repository.findSalidasCalls).toBe(0);
  });

  it('normaliza una nueva salida antes de persistirla', async (): Promise<void> => {
    await service.createSalida({
      cajaPublicId: '  caja-1  ',
      concepto: '  Folios  ',
      descripcion: '  Compra de material  ',
      importeCents: 1_250,
    });

    expect(repository.lastCreateCommand).toEqual({
      cajaPublicId: 'caja-1',
      concepto: 'Folios',
      descripcion: 'Compra de material',
      importeCents: 1_250,
    });
  });

  it('normaliza una descripción vacía a null al actualizar', async (): Promise<void> => {
    await service.updateSalida({
      publicId: '  salida-1  ',
      cajaPublicId: '  caja-1  ',
      concepto: '  Repartidor  ',
      descripcion: '   ',
      importeCents: 2_000,
    });

    expect(repository.lastUpdateCommand).toEqual({
      publicId: 'salida-1',
      cajaPublicId: 'caja-1',
      concepto: 'Repartidor',
      descripcion: null,
      importeCents: 2_000,
    });
  });

  it('normaliza los identificadores al eliminar', async (): Promise<void> => {
    await service.deleteSalida({
      publicId: '  salida-1  ',
      cajaPublicId: '  caja-1  ',
    });

    expect(repository.lastDeleteCommand).toEqual({
      publicId: 'salida-1',
      cajaPublicId: 'caja-1',
    });
  });

  it('rechaza datos económicos inválidos antes de acceder al repository', async (): Promise<void> => {
    await expect(
      service.createSalida({
        cajaPublicId: 'caja-1',
        concepto: '   ',
        descripcion: null,
        importeCents: 1_000,
      }),
    ).rejects.toThrow('El concepto de la salida de caja es obligatorio.');

    await expect(
      service.createSalida({
        cajaPublicId: 'caja-1',
        concepto: 'Folios',
        descripcion: null,
        importeCents: 0,
      }),
    ).rejects.toThrow('El importe de la salida de caja debe ser mayor que cero.');

    expect(repository.lastCreateCommand).toBeNull();
  });

  it('calcula el saldo final teórico a partir del snapshot canónico', async (): Promise<void> => {
    const result = await service.getCierre({
      cajaPublicId: '  caja-1  ',
    });

    expect(repository.lastCierrePublicId).toBe('caja-1');

    expect(result).toEqual({
      cajaPublicId: 'caja-1',
      apertura: '2026-09-21T08:00:00.000Z',
      saldoInicialCents: 10_000,
      ventasAfectanCajaCents: 7_000,
      salidasCajaCents: 1_500,
      saldoFinalTeoricoCents: 15_500,
      tiposPago: repository.cierre?.tiposPago,
    });
  });

  it('rechaza el cierre de una caja que ya no está abierta', async (): Promise<void> => {
    repository.cierre = null;

    await expect(
      service.getCierre({
        cajaPublicId: 'caja-cerrada',
      }),
    ).rejects.toThrow('La caja indicada no está abierta.');
  });

  it('protege el cálculo del saldo final frente a desbordamientos', async (): Promise<void> => {
    repository.cierre = {
      cajaPublicId: 'caja-1',
      apertura: '2026-09-21T08:00:00.000Z',
      importeAperturaCents: Number.MAX_SAFE_INTEGER,
      ventasAfectanCajaCents: 1,
      salidasCajaCents: 0,
      tiposPago: [],
    };

    await expect(
      service.getCierre({
        cajaPublicId: 'caja-1',
      }),
    ).rejects.toThrow('El saldo final teórico de la caja supera el rango numérico seguro.');
  });
});

class FakeCajaRepository implements CajaRepository {
  findSalidasCalls: number = 0;
  lastDesde: string | null = null;
  lastHastaExclusive: string | null = null;
  salidas: readonly SalidaCajaRecord[] = [];
  lastCreateCommand: CrearSalidaCajaCommand | null = null;
  lastUpdateCommand: ActualizarSalidaCajaCommand | null = null;
  lastDeleteCommand: EliminarSalidaCajaCommand | null = null;

  persistedSalida: SalidaCajaRecord = {
    publicId: 'salida-1',
    concepto: 'Folios',
    descripcion: null,
    importeCents: 1_250,
    fecha: '2026-09-21T10:00:00.000Z',
    editable: true,
  };

  lastCierrePublicId: string | null = null;

  cierre: CajaCierreRecord | null = {
    cajaPublicId: 'caja-1',
    apertura: '2026-09-21T08:00:00.000Z',
    importeAperturaCents: 10_000,
    ventasAfectanCajaCents: 7_000,
    salidasCajaCents: 1_500,
    tiposPago: [
      {
        publicId: 'tipo-efectivo',
        nombre: 'Efectivo',
        slug: 'efectivo',
        afectaCaja: true,
        orden: 0,
        operaciones: 2,
        importeVentasCents: 2_000,
      },
      {
        publicId: 'tipo-tarjeta',
        nombre: 'Tarjeta',
        slug: 'tarjeta',
        afectaCaja: false,
        orden: 1,
        operaciones: 1,
        importeVentasCents: 6_000,
      },
    ],
  };

  /**
   * Implementación mínima requerida por el contrato de Caja.
   */
  open(): Promise<CajaAbiertaRecord> {
    return Promise.resolve({
      id: 1,
      publicId: 'caja-1',
      idTerminal: 1,
      apertura: '2026-09-21T08:00:00.000Z',
      importeAperturaCents: 10_000,
    });
  }

  /**
   * Registra el intervalo solicitado y devuelve las salidas preparadas por el test.
   */
  findSalidasByPeriod(desde: string, hastaExclusive: string): Promise<readonly SalidaCajaRecord[]> {
    this.findSalidasCalls++;
    this.lastDesde = desde;
    this.lastHastaExclusive = hastaExclusive;

    return Promise.resolve(this.salidas);
  }

  /**
   * Registra el alta recibida por el servicio.
   */
  createSalida(command: CrearSalidaCajaCommand): Promise<SalidaCajaRecord> {
    this.lastCreateCommand = command;

    return Promise.resolve(this.persistedSalida);
  }

  /**
   * Registra la actualización recibida por el servicio.
   */
  updateSalida(command: ActualizarSalidaCajaCommand): Promise<SalidaCajaRecord> {
    this.lastUpdateCommand = command;

    return Promise.resolve(this.persistedSalida);
  }

  /**
   * Registra la baja recibida por el servicio.
   */
  deleteSalida(command: EliminarSalidaCajaCommand): Promise<void> {
    this.lastDeleteCommand = command;

    return Promise.resolve();
  }

  /**
   * Devuelve el snapshot económico preparado por el test.
   */
  findCierre(cajaPublicId: string): Promise<CajaCierreRecord | null> {
    this.lastCierrePublicId = cajaPublicId;

    return Promise.resolve(this.cierre);
  }
}
