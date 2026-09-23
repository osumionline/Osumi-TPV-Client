import { TestBed } from '@angular/core/testing';
import type { InformeDetalladoConsulta } from '@desktop-contracts/caja/informes/informe-detallado.interface';
import type { InformeSimpleConsulta } from '@desktop-contracts/caja/informes/informe-simple.interface';
import type { InformeVentasConsulta } from '@desktop-contracts/caja/informes/informe-ventas.interface';
import CajaInformesService from '@services/caja/caja-informes.service';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let service: CajaInformesService;
let originalDesktopDescriptor: PropertyDescriptor | undefined;
let consultasSimple: InformeSimpleConsulta[];
let consultasDetallado: InformeDetalladoConsulta[];
let consultasVentas: InformeVentasConsulta[];

describe('CajaInformesService', (): void => {
  beforeEach((): void => {
    originalDesktopDescriptor = Object.getOwnPropertyDescriptor(window, 'osumiDesktop');

    consultasSimple = [];
    consultasDetallado = [];
    consultasVentas = [];

    Object.defineProperty(window, 'osumiDesktop', {
      configurable: true,
      value: {
        caja: {
          openInformeSimple: (consulta: InformeSimpleConsulta): Promise<void> => {
            consultasSimple.push(consulta);

            return Promise.resolve();
          },

          openInformeDetallado: (consulta: InformeDetalladoConsulta): Promise<void> => {
            consultasDetallado.push(consulta);

            return Promise.resolve();
          },

          openInformeVentas: (consulta: InformeVentasConsulta): Promise<void> => {
            consultasVentas.push(consulta);

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

    expect(consultasSimple).toEqual([
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

    expect(consultasSimple).toEqual([
      {
        year: 2026,
        month: 'todos',
      },
    ]);
  });

  it('abre el Informe Detallado mensual mediante Electron', async (): Promise<void> => {
    await expect(
      service.openDetallado({
        year: 2026,
        month: 9,
      }),
    ).resolves.toBeUndefined();

    expect(consultasDetallado).toEqual([
      {
        year: 2026,
        month: 9,
      },
    ]);
  });

  it('permite abrir el Informe Detallado anual', async (): Promise<void> => {
    await service.openDetallado({
      year: 2026,
      month: 'todos',
    });

    expect(consultasDetallado).toEqual([
      {
        year: 2026,
        month: 'todos',
      },
    ]);
  });

  it('abre el Informe de Ventas mensual mediante Electron', async (): Promise<void> => {
    await expect(
      service.openVentas({
        year: 2026,
        month: 9,
        idCategoria: 14,
      }),
    ).resolves.toBeUndefined();

    expect(consultasVentas).toEqual([
      {
        year: 2026,
        month: 9,
        idCategoria: 14,
      },
    ]);
  });

  it('permite abrir el Informe de Ventas anual', async (): Promise<void> => {
    await service.openVentas({
      year: 2026,
      month: 'todos',
      idCategoria: 22,
    });

    expect(consultasVentas).toEqual([
      {
        year: 2026,
        month: 'todos',
        idCategoria: 22,
      },
    ]);
  });
});
