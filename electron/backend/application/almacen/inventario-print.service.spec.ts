import InventarioPrintService from '@backend/application/almacen/inventario-print.service';
import type InventarioPrintWindow from '@backend/contracts/almacen/inventario-print-window.interface';
import type InventarioReportProvider from '@backend/contracts/almacen/inventario-report-provider.interface';
import type InventarioPrintDocumentoInterface from '@desktop-contracts/almacen/inventario-print.interface';
import type {
  InventarioReportConsulta,
  InventarioReportInterface,
} from '@desktop-contracts/almacen/inventario-report.interface';
import { describe, expect, it } from 'vitest';

class FakeInventarioReportProvider implements InventarioReportProvider {
  lastConsulta: InventarioReportConsulta | null = null;

  readonly result: InventarioReportInterface = {
    rows: [
      {
        localizador: 261001,
        proveedorNombre: 'Proveedor',
        marcaNombre: 'Marca',
        referencia: 'REF-1',
        categorias: ['Categoría'],
        nombre: 'Artículo',
        stock: 2,
        precioAlbaranMicros: 10_000_000,
        pucMicros: 12_100_000,
        pvpCents: 2000,
        margenMicroporcentaje: 39_500_000,
        codigosBarrasAdicionales: ['8430000000001'],
      },
    ],
    totalRows: 1,
    mediaMargenMicroporcentaje: 39_500_000,
    totalPucMicros: 24_200_000,
    totalPvpCents: 4000,
  };

  /**
   * Conserva la consulta y devuelve el reporte configurado.
   */
  getInventarioReport(consulta: InventarioReportConsulta): Promise<InventarioReportInterface> {
    this.lastConsulta = consulta;

    return Promise.resolve(this.result);
  }
}

class FakeInventarioPrintWindow implements InventarioPrintWindow {
  lastDocumento: InventarioPrintDocumentoInterface | null = null;

  /**
   * Conserva el documento recibido para su comprobación.
   */
  open(documento: InventarioPrintDocumentoInterface): Promise<void> {
    this.lastDocumento = documento;

    return Promise.resolve();
  }

  /**
   * Devuelve el documento previamente abierto.
   */
  getDocumento(): InventarioPrintDocumentoInterface {
    if (this.lastDocumento === null) {
      throw new Error('No hay documento abierto.');
    }

    return this.lastDocumento;
  }

  /**
   * Simula una impresión sin efectos externos.
   */
  print(): Promise<void> {
    return Promise.resolve();
  }
}

describe('InventarioPrintService', (): void => {
  it('obtiene el snapshot persistido y lo entrega a la ventana', async (): Promise<void> => {
    const reportProvider = new FakeInventarioReportProvider();
    const printWindow = new FakeInventarioPrintWindow();
    const service = new InventarioPrintService(reportProvider, printWindow);

    const consulta: InventarioReportConsulta = {
      idProveedor: 3,
      idMarca: null,
      idCategoria: 8,
      texto: 'camiseta',
      conDescuento: true,
      columnas: ['localizador', 'nombre', 'stock', 'pvp'],
    };

    await service.open(consulta);

    expect(reportProvider.lastConsulta).toEqual(consulta);

    expect(printWindow.lastDocumento).toEqual({
      columnas: ['localizador', 'nombre', 'stock', 'pvp'],
      report: reportProvider.result,
    });
  });
});
