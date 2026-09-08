import CaducidadReportService from '@backend/application/almacen/caducidad-report.service';
import type CaducidadReportProvider from '@backend/contracts/almacen/caducidad-report-provider.interface';
import type CaducidadReportWindow from '@backend/contracts/almacen/caducidad-report-window.interface';
import type {
  CaducidadReportConsulta,
  CaducidadReportInterface,
} from '@desktop-contracts/almacen/caducidad-report.interface';
import { describe, expect, it } from 'vitest';

class FakeCaducidadReportProvider implements CaducidadReportProvider {
  lastConsulta: CaducidadReportConsulta | null = null;
  readonly result: CaducidadReportInterface = {
    anios: [
      {
        anio: 2026,
        unidades: 2,
        totalPvpCents: 400,
        totalPucMicros: 2_000_000,
        meses: [
          {
            mes: 8,
            unidades: 2,
            totalPvpCents: 400,
            totalPucMicros: 2_000_000,
            marcas: [
              {
                idMarca: 1,
                nombre: 'Marca Uno',
                unidades: 2,
                totalPvpCents: 400,
                totalPucMicros: 2_000_000,
              },
            ],
          },
        ],
      },
    ],
    totalUnidades: 2,
    totalPvpCents: 400,
    totalPucMicros: 2_000_000,
  };

  /**
   * Conserva la consulta y devuelve el informe configurado.
   */
  getCaducidadReport(consulta: CaducidadReportConsulta): Promise<CaducidadReportInterface> {
    this.lastConsulta = consulta;

    return Promise.resolve(this.result);
  }
}

class FakeCaducidadReportWindow implements CaducidadReportWindow {
  lastDocumento: CaducidadReportInterface | null = null;

  /**
   * Conserva el snapshot recibido.
   */
  open(documento: CaducidadReportInterface): Promise<void> {
    this.lastDocumento = documento;

    return Promise.resolve();
  }

  /**
   * Devuelve el documento previamente abierto.
   */
  getDocumento(): CaducidadReportInterface {
    if (this.lastDocumento === null) {
      throw new Error('No hay informe abierto.');
    }

    return this.lastDocumento;
  }

  /**
   * Simula la impresión de la ventana.
   */
  print(): Promise<void> {
    return Promise.resolve();
  }
}

describe('CaducidadReportService', (): void => {
  it('obtiene el snapshot persistido y lo entrega a la ventana', async (): Promise<void> => {
    const reportProvider = new FakeCaducidadReportProvider();
    const reportWindow = new FakeCaducidadReportWindow();
    const service = new CaducidadReportService(reportProvider, reportWindow);
    const consulta: CaducidadReportConsulta = {
      anio: 2026,
      mes: 8,
      idMarca: 1,
      nombre: 'artículo',
    };

    await service.open(consulta);

    expect(reportProvider.lastConsulta).toEqual(consulta);
    expect(reportWindow.lastDocumento).toEqual(reportProvider.result);
  });
});
