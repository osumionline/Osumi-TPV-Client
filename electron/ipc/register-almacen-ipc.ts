import type AlmacenService from '@backend/application/almacen/almacen.service';
import type CaducidadReportService from '@backend/application/almacen/caducidad-report.service';
import type InventarioCsvService from '@backend/application/almacen/inventario-csv.service';
import type InventarioPrintService from '@backend/application/almacen/inventario-print.service';
import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidad-create.interface';
import type { CaducidadReportConsulta } from '@desktop-contracts/almacen/caducidad-report.interface';
import type {
  CaducidadConsulta,
  CaducidadFilterOptionsInterface,
  CaducidadResultado,
} from '@desktop-contracts/almacen/caducidad.interface';
import type {
  ImprentaArticuloSearchConsulta,
  ImprentaArticuloSearchInterface,
} from '@desktop-contracts/almacen/imprenta-articulo.interface';
import type {
  InventarioCsvExportResult,
  InventarioReportConsulta,
} from '@desktop-contracts/almacen/inventario-report.interface';
import type { InventarioSaveCommand } from '@desktop-contracts/almacen/inventario-save.interface';
import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario.interface';
import type { MainWindowProvider } from '@ipc/assert-trusted-sender';
import { assertTrustedSender } from '@ipc/assert-trusted-sender';
import IPC_CHANNELS from '@ipc/channels';
import { ipcMain } from 'electron';

/**
 * Registra los casos de uso de Almacén expuestos al renderer.
 */
export default function registerAlmacenIpc(
  getMainWindow: MainWindowProvider,
  almacenService: AlmacenService,
  inventarioCsvService: InventarioCsvService,
  inventarioPrintService: InventarioPrintService,
  caducidadReportService: CaducidadReportService,
): void {
  ipcMain.handle(
    IPC_CHANNELS.almacenSearchInventario,
    async (event, consulta: InventarioConsulta): Promise<InventarioResultado> => {
      assertTrustedSender(event, getMainWindow);

      return almacenService.searchInventario(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenExportInventarioCsv,
    async (event, consulta: InventarioReportConsulta): Promise<InventarioCsvExportResult> => {
      assertTrustedSender(event, getMainWindow);

      return inventarioCsvService.export(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenOpenInventarioPrint,
    async (event, consulta: InventarioReportConsulta): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await inventarioPrintService.open(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenSaveInventarioRow,
    async (event, command: InventarioSaveCommand): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await almacenService.saveInventarioRow(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenSaveInventarioRows,
    async (event, commands: readonly InventarioSaveCommand[]): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await almacenService.saveInventarioRows(commands);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenDeactivateArticulo,
    async (event, idArticulo: number): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await almacenService.deactivateArticulo(idArticulo);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenSearchCaducidades,
    async (event, consulta: CaducidadConsulta): Promise<CaducidadResultado> => {
      assertTrustedSender(event, getMainWindow);

      return almacenService.searchCaducidades(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenGetCaducidadFilterOptions,
    async (event): Promise<CaducidadFilterOptionsInterface> => {
      assertTrustedSender(event, getMainWindow);

      return almacenService.getCaducidadFilterOptions();
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenSearchCaducidadArticulos,
    async (event, texto: string): Promise<readonly CaducidadArticuloSearchInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return almacenService.searchCaducidadArticulos(texto);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenCreateCaducidad,
    async (event, command: CaducidadCreateCommand): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await almacenService.createCaducidad(command);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenDeactivateCaducidad,
    async (event, idCaducidad: number): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await almacenService.deactivateCaducidad(idCaducidad);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenOpenCaducidadReport,
    async (event, consulta: CaducidadReportConsulta): Promise<void> => {
      assertTrustedSender(event, getMainWindow);

      await caducidadReportService.open(consulta);
    },
  );

  ipcMain.handle(
    IPC_CHANNELS.almacenSearchImprentaArticulos,
    async (
      event,
      consulta: ImprentaArticuloSearchConsulta,
    ): Promise<readonly ImprentaArticuloSearchInterface[]> => {
      assertTrustedSender(event, getMainWindow);

      return almacenService.searchImprentaArticulos(consulta);
    },
  );
}
