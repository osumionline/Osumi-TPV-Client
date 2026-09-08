import type CaducidadReportProvider from '@backend/contracts/almacen/caducidad-report-provider.interface';
import type CaducidadReportWindow from '@backend/contracts/almacen/caducidad-report-window.interface';
import type {
  CaducidadReportConsulta,
  CaducidadReportInterface,
} from '@desktop-contracts/almacen/caducidad-report.interface';

/**
 * Prepara y abre informes persistidos de Caducidades.
 */
export default class CaducidadReportService {
  constructor(
    private readonly reportProvider: CaducidadReportProvider,
    private readonly reportWindow: CaducidadReportWindow,
  ) {}

  /**
   * Recupera el snapshot persistido y abre la ventana independiente.
   */
  async open(consulta: CaducidadReportConsulta): Promise<void> {
    const documento: CaducidadReportInterface =
      await this.reportProvider.getCaducidadReport(consulta);

    await this.reportWindow.open(documento);
  }
}
