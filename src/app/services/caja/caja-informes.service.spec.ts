import { TestBed } from '@angular/core/testing';
import type {
  InformeSimpleConsulta,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';
import CajaInformesService from '@services/caja/caja-informes.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let service: CajaInformesService;

let originalDesktopDescriptor: PropertyDescriptor | undefined;

let consultas: InformeSimpleConsulta[];

let result: InformeSimpleResultado;

describe('CajaInformesService', (): void => {
  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    consultas = [];

    result = {
      granularidad: 'dia',
      tiposPago: [
        {
          publicId: 'tipo-pago-efectivo',
          nombre: 'Efectivo',
          slug: 'efectivo',
          orden: 0,
        },
      ],
      items: [],
      totales: {
        numeroVentas: 0,
        primerTicket: null,
        ultimoTicket: null,
        importesTipoPago: [
          {
            tipoPagoPublicId: 'tipo-pago-efectivo',
            importeCents: 0,
          },
        ],
        totalCents: 0,
        sumaCents: 0,
      },
    };

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        caja: {
          getInformeSimple: (consulta: InformeSimpleConsulta): Promise<InformeSimpleResultado> => {
            consultas.push(consulta);

            return Promise.resolve(result);
          },
        },
      },
    });

    TestBed.configureTestingModule({
      providers: [CajaInformesService],
    });

    service = TestBed.inject(CajaInformesService);
  });

  afterEach((): void => {
    if (originalDesktopDescriptor !== undefined) {
      Object.defineProperty(window, 'osumiDesktop', originalDesktopDescriptor);

      return;
    }

    Reflect.deleteProperty(window, 'osumiDesktop');
  });

  it('delega el Informe Simple en la API de Electron', async (): Promise<void> => {
    await expect(
      service.getSimple({
        year: 2026,
        month: 9,
      }),
    ).resolves.toBe(result);

    expect(consultas).toEqual([
      {
        year: 2026,
        month: 9,
      },
    ]);
  });

  it('permite solicitar el año completo', async (): Promise<void> => {
    await service.getSimple({
      year: 2026,
      month: 'todos',
    });

    expect(consultas).toEqual([
      {
        year: 2026,
        month: 'todos',
      },
    ]);
  });
});
