import type InventarioPrintWindow from '@backend/contracts/almacen/inventario-print-window.interface';
import type InventarioReportProvider from '@backend/contracts/almacen/inventario-report-provider.interface';
import type InventarioPrintDocumentoInterface from '@desktop-contracts/almacen/inventario-print.interface';
import type {
  InventarioReportConsulta,
  InventarioReportInterface,
} from '@desktop-contracts/almacen/inventario-report.interface';

/**
 * Prepara y abre vistas de impresión persistidas de Inventario.
 */
export default class InventarioPrintService {
  constructor(
    private readonly reportProvider: InventarioReportProvider,
    private readonly printWindow: InventarioPrintWindow,
  ) {}

  /**
   * Recupera el snapshot persistido y abre la vista independiente.
   */
  async open(consulta: InventarioReportConsulta): Promise<void> {
    const report: InventarioReportInterface =
      await this.reportProvider.getInventarioReport(consulta);

    const documento: InventarioPrintDocumentoInterface = {
      columnas: [...consulta.columnas],
      report,
    };

    await this.printWindow.open(documento);
  }
}
