import { TestBed } from '@angular/core/testing';
import type { InformeSimpleConsulta } from '@desktop-contracts/caja/informes/informe-simple.interface';
import CajaInformesService from '@services/caja/caja-informes.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let service: CajaInformesService;

let originalDesktopDescriptor: PropertyDescriptor | undefined;

let consultas: InformeSimpleConsulta[];

describe('CajaInformesService', (): void => {
  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    consultas = [];

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,

      value: {
        caja: {
          openInformeSimple: (consulta: InformeSimpleConsulta): Promise<void> => {
            consultas.push(consulta);

            return Promise.resolve();
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

  it('abre el Informe Simple mensual mediante Electron', async (): Promise<void> => {
    await expect(
      service.openSimple({
        year: 2026,
        month: 9,
      }),
    ).resolves.toBeUndefined();

    expect(consultas).toEqual([
      {
        year: 2026,
        month: 9,
      },
    ]);
  });

  it('permite abrir el Informe Simple anual', async (): Promise<void> => {
    await service.openSimple({
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
