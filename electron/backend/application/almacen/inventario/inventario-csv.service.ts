import type InventarioCsvBuilder from '@backend/application/almacen/inventario/inventario-csv.builder';
import type InventarioCsvFileSaver from '@backend/contracts/almacen/inventario/inventario-csv-file-saver.interface';
import type InventarioReportProvider from '@backend/contracts/almacen/inventario/inventario-report-provider.interface';
import type {
  InventarioCsvExportResult,
  InventarioReportConsulta,
  InventarioReportInterface,
} from '@desktop-contracts/almacen/inventario/inventario-report.interface';

/**
 * Coordina la generación y guardado de exportaciones CSV de Inventario.
 */
export default class InventarioCsvService {
  constructor(
    private readonly reportProvider: InventarioReportProvider,
    private readonly csvBuilder: InventarioCsvBuilder,
    private readonly fileSaver: InventarioCsvFileSaver,
    private readonly currentDateProvider: () => Date = (): Date => new Date(),
  ) {}

  /**
   * Exporta el snapshot persistido correspondiente a los filtros actuales.
   */
  async export(consulta: InventarioReportConsulta): Promise<InventarioCsvExportResult> {
    const report: InventarioReportInterface =
      await this.reportProvider.getInventarioReport(consulta);

    const content: string = this.csvBuilder.build(report, consulta.columnas);

    const date: Date = this.currentDateProvider();

    if (!Number.isFinite(date.getTime())) {
      throw new Error('No se ha podido determinar la fecha de la exportación.');
    }

    const defaultFileName: string = `inventario-${date.toISOString().slice(0, 10)}.csv`;

    const saved: boolean = await this.fileSaver.save(defaultFileName, content);

    return saved ? 'saved' : 'cancelled';
  }
}
