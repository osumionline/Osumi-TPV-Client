import CajaInformePrintService from '@backend/application/caja/informes/caja-informe-print.service';
import type CajaInformePrintWindow from '@backend/contracts/caja/informes/caja-informe-print-window.interface';
import type InformeSimpleProvider from '@backend/contracts/caja/informes/informe-simple-provider.interface';
import type { CajaInformePrintDocumento } from '@desktop-contracts/caja/informes/caja-informe-print.interface';
import type {
  InformeSimpleConsulta,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';
import { describe, expect, it } from 'vitest';

class FakeInformeSimpleProvider implements InformeSimpleProvider {
  lastConsulta: InformeSimpleConsulta | null = null;

  readonly resultado: InformeSimpleResultado = {
    granularidad: 'dia',

    tiposPago: [
      {
        publicId: 'efectivo',
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
          tipoPagoPublicId: 'efectivo',
          importeCents: 0,
        },
      ],
      totalCents: 0,
      sumaCents: 0,
    },
  };

  /**
   * Conserva la consulta y devuelve
   * el resultado configurado por el test.
   */
  getInforme(consulta: InformeSimpleConsulta): Promise<InformeSimpleResultado> {
    this.lastConsulta = consulta;

    return Promise.resolve(this.resultado);
  }
}

class FakeCajaInformePrintWindow implements CajaInformePrintWindow {
  lastDocumento: CajaInformePrintDocumento | null = null;

  /**
   * Conserva el documento recibido.
   */
  open(documento: CajaInformePrintDocumento): Promise<void> {
    this.lastDocumento = documento;

    return Promise.resolve();
  }

  /**
   * Devuelve el documento previamente abierto.
   */
  getDocumento(): CajaInformePrintDocumento {
    if (this.lastDocumento === null) {
      throw new Error('No hay ningún documento abierto.');
    }

    return this.lastDocumento;
  }

  /**
   * Simula la impresión sin efectos externos.
   */
  print(): Promise<void> {
    return Promise.resolve();
  }
}

describe('CajaInformePrintService', (): void => {
  it('genera el Informe Simple antes de abrir la ventana', async (): Promise<void> => {
    const provider: FakeInformeSimpleProvider = new FakeInformeSimpleProvider();

    const printWindow: FakeCajaInformePrintWindow = new FakeCajaInformePrintWindow();

    const service: CajaInformePrintService = new CajaInformePrintService(provider, printWindow);

    await service.openSimple({
      year: 2026,
      month: 9,
    });

    expect(provider.lastConsulta).toEqual({
      year: 2026,
      month: 9,
    });

    expect(printWindow.lastDocumento).toEqual({
      tipo: 'simple',

      consulta: {
        year: 2026,
        month: 9,
      },

      resultado: provider.resultado,
    });
  });

  it('permite materializar un informe anual', async (): Promise<void> => {
    const provider: FakeInformeSimpleProvider = new FakeInformeSimpleProvider();

    const printWindow: FakeCajaInformePrintWindow = new FakeCajaInformePrintWindow();

    const service: CajaInformePrintService = new CajaInformePrintService(provider, printWindow);

    await service.openSimple({
      year: 2025,
      month: 'todos',
    });

    expect(printWindow.lastDocumento).toMatchObject({
      tipo: 'simple',

      consulta: {
        year: 2025,
        month: 'todos',
      },
    });
  });
});
