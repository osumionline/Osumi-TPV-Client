import CajaInformePrintService from '@backend/application/caja/informes/caja-informe-print.service';
import type CajaInformePrintWindow from '@backend/contracts/caja/informes/caja-informe-print-window.interface';
import type InformeDetalladoProvider from '@backend/contracts/caja/informes/informe-detallado-provider.interface';
import type InformeSimpleProvider from '@backend/contracts/caja/informes/informe-simple-provider.interface';
import type InformeVentasProvider from '@backend/contracts/caja/informes/informe-ventas-provider.interface';
import type { CajaInformePrintDocumento } from '@desktop-contracts/caja/informes/caja-informe-print.interface';
import type {
  InformeDetalladoConsulta,
  InformeDetalladoResultado,
} from '@desktop-contracts/caja/informes/informe-detallado.interface';
import type {
  InformeSimpleConsulta,
  InformeSimpleResultado,
} from '@desktop-contracts/caja/informes/informe-simple.interface';
import type {
  InformeVentasConsulta,
  InformeVentasResultado,
} from '@desktop-contracts/caja/informes/informe-ventas.interface';
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

class FakeInformeDetalladoProvider implements InformeDetalladoProvider {
  lastConsulta: InformeDetalladoConsulta | null = null;

  readonly resultado: InformeDetalladoResultado = {
    ventas: {
      numeroVentas: 3,
      numeroVentasAnterior: 2,
      diferenciaNumeroVentas: 1,
      margenBps: 3500,
      margenAnteriorBps: 3200,
      diferenciaMargenBps: 300,
    },

    marcas: [],
    marcasTotales: {
      totalVentasPvpMicros: 0,
      totalBeneficioMicros: 0,
      margenBps: 0,
    },

    articulos: [],
    articulosTotales: {
      totalUnidadesVendidas: 0,
      totalVentasPvpMicros: 0,
      totalBeneficioMicros: 0,
    },
  };

  /**
   * Conserva la consulta y devuelve
   * el resultado configurado por el test.
   */
  getInforme(consulta: InformeDetalladoConsulta): Promise<InformeDetalladoResultado> {
    this.lastConsulta = consulta;

    return Promise.resolve(this.resultado);
  }
}

class FakeInformeVentasProvider implements InformeVentasProvider {
  lastConsulta: InformeVentasConsulta | null = null;

  readonly resultado: InformeVentasResultado = {
    categoria: {
      idCategoria: 10,
      categoriaPublicId: 'categoria-10',
      nombre: 'Categoría',

      importeMicros: 1_000_000,
      unidades: 1,
      ventasPvpMicros: 1_000_000,
      beneficioMicros: 400_000,
      margenBps: 4000,

      articulos: [],
      marcas: [],
      subcategorias: [],
    },
  };

  /**
   * Conserva la consulta y devuelve
   * el resultado configurado por el test.
   */
  getInforme(consulta: InformeVentasConsulta): Promise<InformeVentasResultado> {
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
    const simpleProvider: FakeInformeSimpleProvider = new FakeInformeSimpleProvider();
    const detalladoProvider: FakeInformeDetalladoProvider = new FakeInformeDetalladoProvider();
    const printWindow: FakeCajaInformePrintWindow = new FakeCajaInformePrintWindow();
    const ventasProvider: FakeInformeVentasProvider = new FakeInformeVentasProvider();

    const service: CajaInformePrintService = new CajaInformePrintService(
      simpleProvider,
      detalladoProvider,
      ventasProvider,
      printWindow,
    );

    await service.openSimple({
      year: 2026,
      month: 9,
    });

    expect(simpleProvider.lastConsulta).toEqual({
      year: 2026,
      month: 9,
    });

    expect(printWindow.lastDocumento).toEqual({
      tipo: 'simple',

      consulta: {
        year: 2026,
        month: 9,
      },

      resultado: simpleProvider.resultado,
    });
  });

  it('permite materializar un Informe Simple anual', async (): Promise<void> => {
    const simpleProvider: FakeInformeSimpleProvider = new FakeInformeSimpleProvider();
    const detalladoProvider: FakeInformeDetalladoProvider = new FakeInformeDetalladoProvider();
    const printWindow: FakeCajaInformePrintWindow = new FakeCajaInformePrintWindow();
    const ventasProvider: FakeInformeVentasProvider = new FakeInformeVentasProvider();

    const service: CajaInformePrintService = new CajaInformePrintService(
      simpleProvider,
      detalladoProvider,
      ventasProvider,
      printWindow,
    );

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

  it('genera el Informe Detallado antes de abrir la ventana', async (): Promise<void> => {
    const simpleProvider: FakeInformeSimpleProvider = new FakeInformeSimpleProvider();
    const detalladoProvider: FakeInformeDetalladoProvider = new FakeInformeDetalladoProvider();
    const printWindow: FakeCajaInformePrintWindow = new FakeCajaInformePrintWindow();
    const ventasProvider: FakeInformeVentasProvider = new FakeInformeVentasProvider();

    const service: CajaInformePrintService = new CajaInformePrintService(
      simpleProvider,
      detalladoProvider,
      ventasProvider,
      printWindow,
    );

    await service.openDetallado({
      year: 2026,
      month: 9,
    });

    expect(detalladoProvider.lastConsulta).toEqual({
      year: 2026,
      month: 9,
    });

    expect(printWindow.lastDocumento).toEqual({
      tipo: 'detallado',

      consulta: {
        year: 2026,
        month: 9,
      },

      resultado: detalladoProvider.resultado,
    });
  });

  it('permite materializar un Informe Detallado anual', async (): Promise<void> => {
    const simpleProvider: FakeInformeSimpleProvider = new FakeInformeSimpleProvider();
    const detalladoProvider: FakeInformeDetalladoProvider = new FakeInformeDetalladoProvider();
    const printWindow: FakeCajaInformePrintWindow = new FakeCajaInformePrintWindow();
    const ventasProvider: FakeInformeVentasProvider = new FakeInformeVentasProvider();

    const service: CajaInformePrintService = new CajaInformePrintService(
      simpleProvider,
      detalladoProvider,
      ventasProvider,
      printWindow,
    );

    await service.openDetallado({
      year: 2025,
      month: 'todos',
    });

    expect(printWindow.lastDocumento).toMatchObject({
      tipo: 'detallado',

      consulta: {
        year: 2025,
        month: 'todos',
      },
    });
  });

  it('genera el Informe de Ventas antes de abrir la ventana', async (): Promise<void> => {
    const simpleProvider: FakeInformeSimpleProvider = new FakeInformeSimpleProvider();

    const detalladoProvider: FakeInformeDetalladoProvider = new FakeInformeDetalladoProvider();

    const ventasProvider: FakeInformeVentasProvider = new FakeInformeVentasProvider();

    const printWindow: FakeCajaInformePrintWindow = new FakeCajaInformePrintWindow();

    const service: CajaInformePrintService = new CajaInformePrintService(
      simpleProvider,
      detalladoProvider,
      ventasProvider,
      printWindow,
    );

    await service.openVentas({
      year: 2026,
      month: 9,
      idCategoria: 10,
    });

    expect(ventasProvider.lastConsulta).toEqual({
      year: 2026,
      month: 9,
      idCategoria: 10,
    });

    expect(printWindow.lastDocumento).toEqual({
      tipo: 'ventas',

      consulta: {
        year: 2026,
        month: 9,
        idCategoria: 10,
      },

      resultado: ventasProvider.resultado,
    });
  });

  it('permite materializar un Informe de Ventas anual', async (): Promise<void> => {
    const simpleProvider: FakeInformeSimpleProvider = new FakeInformeSimpleProvider();

    const detalladoProvider: FakeInformeDetalladoProvider = new FakeInformeDetalladoProvider();

    const ventasProvider: FakeInformeVentasProvider = new FakeInformeVentasProvider();

    const printWindow: FakeCajaInformePrintWindow = new FakeCajaInformePrintWindow();

    const service: CajaInformePrintService = new CajaInformePrintService(
      simpleProvider,
      detalladoProvider,
      ventasProvider,
      printWindow,
    );

    await service.openVentas({
      year: 2025,
      month: 'todos',
      idCategoria: 25,
    });

    expect(printWindow.lastDocumento).toMatchObject({
      tipo: 'ventas',

      consulta: {
        year: 2025,
        month: 'todos',
        idCategoria: 25,
      },
    });
  });
});
