import InventarioCsvBuilder from '@backend/application/almacen/inventario/inventario-csv.builder';
import InventarioCsvService from '@backend/application/almacen/inventario/inventario-csv.service';
import type InventarioCsvFileSaver from '@backend/contracts/almacen/inventario/inventario-csv-file-saver.interface';
import type InventarioReportProvider from '@backend/contracts/almacen/inventario/inventario-report-provider.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type { ApplicationLogEvent } from '@backend/domain/logging/application-log.types';
import type {
  InventarioCsvExportResult,
  InventarioReportConsulta,
  InventarioReportInterface,
} from '@desktop-contracts/almacen/inventario/inventario-report.interface';
import { describe, expect, it } from 'vitest';

class FakeInventarioReportProvider implements InventarioReportProvider {
  error: Error | null = null;

  readonly report: InventarioReportInterface = {
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
   * Devuelve el snapshot configurado o simula
   * un fallo ya registrado por el proveedor real.
   */
  getInventarioReport(consulta: InventarioReportConsulta): Promise<InventarioReportInterface> {
    void consulta;

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.report);
  }
}

class FakeInventarioCsvFileSaver implements InventarioCsvFileSaver {
  saved: boolean = true;
  error: Error | null = null;
  lastDefaultFileName: string | null = null;
  lastContent: string | null = null;

  /**
   * Simula el diálogo y escritura del CSV.
   */
  save(defaultFileName: string, content: string): Promise<boolean> {
    this.lastDefaultFileName = defaultFileName;
    this.lastContent = content;

    if (this.error !== null) {
      return Promise.reject(this.error);
    }

    return Promise.resolve(this.saved);
  }
}

/**
 * Logger controlado utilizado por las pruebas
 * de exportación CSV de Inventario.
 */
class TestApplicationLogger implements ApplicationLogger {
  readonly warnEvents: ApplicationLogEvent[] = [];

  /**
   * Ignora entradas de diagnóstico.
   */
  debug(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Ignora entradas informativas.
   */
  info(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * Conserva los avisos emitidos.
   */
  warn(event: ApplicationLogEvent): void {
    this.warnEvents.push(event);
  }

  /**
   * Ignora errores.
   */
  error(event: ApplicationLogEvent): void {
    void event;
  }

  /**
   * No existen escrituras pendientes.
   */
  flush(): Promise<void> {
    return Promise.resolve();
  }
}

describe('InventarioCsvService', (): void => {
  it('genera y guarda el CSV sin registrar incidencias', async (): Promise<void> => {
    const reportProvider = new FakeInventarioReportProvider();
    const fileSaver = new FakeInventarioCsvFileSaver();
    const applicationLogger = new TestApplicationLogger();

    const service = createService(reportProvider, fileSaver, applicationLogger);

    const result: InventarioCsvExportResult = await service.export(createConsulta());

    expect(result).toBe('saved');
    expect(fileSaver.lastDefaultFileName).toBe('inventario-2026-09-07.csv');
    expect(fileSaver.lastContent).toContain('Localizador;Nombre;Stock');
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('trata la cancelación del diálogo como una salida normal', async (): Promise<void> => {
    const reportProvider = new FakeInventarioReportProvider();
    const fileSaver = new FakeInventarioCsvFileSaver();
    const applicationLogger = new TestApplicationLogger();

    fileSaver.saved = false;

    const service = createService(reportProvider, fileSaver, applicationLogger);

    const result: InventarioCsvExportResult = await service.export(createConsulta());

    expect(result).toBe('cancelled');
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('no duplica el logging cuando falla el proveedor del snapshot', async (): Promise<void> => {
    const reportProvider = new FakeInventarioReportProvider();
    const fileSaver = new FakeInventarioCsvFileSaver();
    const applicationLogger = new TestApplicationLogger();
    const error: Error = new Error('No se ha podido generar el snapshot.');

    reportProvider.error = error;

    const service = createService(reportProvider, fileSaver, applicationLogger);

    await expect(service.export(createConsulta())).rejects.toBe(error);

    expect(fileSaver.lastDefaultFileName).toBeNull();
    expect(applicationLogger.warnEvents).toEqual([]);
  });

  it('registra y propaga un fallo al guardar el CSV', async (): Promise<void> => {
    const reportProvider = new FakeInventarioReportProvider();
    const fileSaver = new FakeInventarioCsvFileSaver();
    const applicationLogger = new TestApplicationLogger();
    const error: Error = new Error('No se ha podido escribir el archivo.');

    fileSaver.error = error;

    const service = createService(reportProvider, fileSaver, applicationLogger);

    await expect(service.export(createConsulta())).rejects.toBe(error);

    expect(applicationLogger.warnEvents).toEqual([
      {
        area: 'almacen',
        operation: 'export-inventory-csv',
        message: 'No se ha podido exportar el Inventario a CSV.',
        error,
        context: {
          columnCount: 3,
        },
      },
    ]);
  });

  it('registra una fecha técnica inválida de exportación', async (): Promise<void> => {
    const reportProvider = new FakeInventarioReportProvider();
    const fileSaver = new FakeInventarioCsvFileSaver();
    const applicationLogger = new TestApplicationLogger();

    const service = new InventarioCsvService(
      reportProvider,
      new InventarioCsvBuilder(),
      fileSaver,
      applicationLogger,
      (): Date => new Date(Number.NaN),
    );

    await expect(service.export(createConsulta())).rejects.toThrow(
      'No se ha podido determinar la fecha de la exportación.',
    );

    expect(fileSaver.lastDefaultFileName).toBeNull();

    expect(applicationLogger.warnEvents).toHaveLength(1);

    expect(applicationLogger.warnEvents[0]).toMatchObject({
      area: 'almacen',
      operation: 'export-inventory-csv',
      message: 'No se ha podido exportar el Inventario a CSV.',
      context: {
        columnCount: 3,
      },
    });
  });
});

/**
 * Crea el servicio con una fecha determinista.
 */
function createService(
  reportProvider: InventarioReportProvider,
  fileSaver: InventarioCsvFileSaver,
  applicationLogger: ApplicationLogger,
): InventarioCsvService {
  return new InventarioCsvService(
    reportProvider,
    new InventarioCsvBuilder(),
    fileSaver,
    applicationLogger,
    (): Date => new Date('2026-09-07T08:00:00.000Z'),
  );
}

/**
 * Crea una consulta válida para las pruebas.
 */
function createConsulta(): InventarioReportConsulta {
  return {
    idProveedor: null,
    idMarca: null,
    idCategoria: null,
    texto: '',
    conDescuento: false,
    columnas: ['localizador', 'nombre', 'stock'],
  };
}
