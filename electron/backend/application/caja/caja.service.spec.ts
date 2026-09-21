import CajaService from '@backend/application/caja/caja.service';
import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CajaAbiertaRecord from '@backend/domain/caja/caja-abierta-record.interface';
import type SalidaCajaRecord from '@backend/domain/caja/salida-caja-record.interface';
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
});

class FakeCajaRepository implements CajaRepository {
  findSalidasCalls: number = 0;
  lastDesde: string | null = null;
  lastHastaExclusive: string | null = null;
  salidas: readonly SalidaCajaRecord[] = [];

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
}
