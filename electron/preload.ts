import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type CategoriaInterface from '@desktop-contracts/categorias/categoria.interface';
import type { ClienteEstadisticasInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';
import OsumiDesktopApi from '@desktop-contracts/desktop-api';
import type EmpleadoInterface from '@desktop-contracts/empleados/empleado.interface';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import type LegacyImportProgress from '@desktop-contracts/legacy-import/legacy-import-progress.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import type PrinterInterface from '@desktop-contracts/printing/printer.interface';
import type PrintingSettings from '@desktop-contracts/printing/printing-settings.interface';
import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';
import type CrearReservaCommand from '@desktop-contracts/reservas/crear-reserva-command.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import AppInfo from '@desktop-contracts/system/app-info.interface';
import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type GuardarVentaResult from '@desktop-contracts/ventas/guardar-venta-result.interface';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type {
  VentaHistoricoConsulta,
  VentaHistoricoDetalle,
  VentasHistoricoResultado,
} from '@desktop-contracts/ventas/venta-historico.interface';
import type {
  VentaPostventaCambiarClienteCommand,
  VentaPostventaCambiarTipoPagoCommand,
} from '@desktop-contracts/ventas/venta-postventa.interface';
import type { VentaTicketEmailCommand } from '@desktop-contracts/ventas/venta-ticket-email.interface';
import type { VentaTicketInterface } from '@desktop-contracts/ventas/venta-ticket.interface';
import type VentasContextInterface from '@desktop-contracts/ventas/ventas-context.interface';
import IPC_CHANNELS from '@ipc/channels';
import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

const desktopApi: OsumiDesktopApi = Object.freeze({
  isElectron: true,

  application: {
    getState: (): Promise<ApplicationStateResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.applicationGetState) as Promise<ApplicationStateResult>,
  },

  system: Object.freeze({
    getAppInfo: (): Promise<AppInfo> =>
      ipcRenderer.invoke(IPC_CHANNELS.systemGetAppInfo) as Promise<AppInfo>,
  }),

  legacyImport: {
    selectPackage: (): Promise<LegacyImportPackageSelectionResult> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.legacyImportSelectPackage,
      ) as Promise<LegacyImportPackageSelectionResult>,

    analyzePackage: (selectionId: string): Promise<LegacyImportAnalysisReport> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.legacyImportAnalyzePackage,
        selectionId,
      ) as Promise<LegacyImportAnalysisReport>,

    confirmReviewDecisions: (
      selectionId: string,
      decisions: readonly LegacyImportReviewDecision[],
    ): Promise<LegacyImportPreparationResult> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.legacyImportConfirmReviewDecisions,
        selectionId,
        decisions,
      ) as Promise<LegacyImportPreparationResult>,

    startImport: (selectionId: string): Promise<LegacyImportStartResult> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.legacyImportStart,

        selectionId,
      ) as Promise<LegacyImportStartResult>,

    onImportProgress: (listener: (progress: LegacyImportProgress) => void): (() => void) => {
      const wrappedListener = (
        _event: IpcRendererEvent,

        progress: LegacyImportProgress,
      ): void => {
        listener(progress);
      };

      ipcRenderer.on(
        IPC_CHANNELS.legacyImportProgress,

        wrappedListener,
      );

      return (): void => {
        ipcRenderer.removeListener(
          IPC_CHANNELS.legacyImportProgress,

          wrappedListener,
        );
      };
    },
  },

  configuration: Object.freeze({
    install: (command: InstallationCommand): Promise<InstallationResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationInstall, command) as Promise<InstallationResult>,
  }),

  printing: Object.freeze({
    getPrinters: (): Promise<readonly PrinterInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.printingGetPrinters) as Promise<readonly PrinterInterface[]>,

    getSettings: (): Promise<PrintingSettings> =>
      ipcRenderer.invoke(IPC_CHANNELS.printingGetSettings) as Promise<PrintingSettings>,

    setTicketPrinterDeviceName: (deviceName: string | null): Promise<PrintingSettings> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.printingSetTicketPrinter,
        deviceName,
      ) as Promise<PrintingSettings>,

    renderPdf: (documentHtml: string): Promise<Uint8Array> =>
      ipcRenderer.invoke(IPC_CHANNELS.printingRenderPdf, documentHtml) as Promise<Uint8Array>,

    printTicket: (documentHtml: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.printingPrintTicket, documentHtml) as Promise<void>,

    printPdf: (pdf: Uint8Array): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.printingPrintPdf, pdf) as Promise<void>,
  }),

  marcas: Object.freeze({
    getAll: (): Promise<readonly MarcaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.marcasGetAll) as Promise<readonly MarcaInterface[]>,
  }),

  proveedores: Object.freeze({
    getAll: (): Promise<readonly ProveedorInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.proveedoresGetAll) as Promise<readonly ProveedorInterface[]>,
  }),

  empleados: Object.freeze({
    getAll: (): Promise<readonly EmpleadoInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.empleadosGetAll) as Promise<readonly EmpleadoInterface[]>,
  }),

  categorias: Object.freeze({
    getAll: (): Promise<readonly CategoriaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.categoriasGetAll) as Promise<readonly CategoriaInterface[]>,
  }),

  clientes: Object.freeze({
    getAll: (): Promise<readonly ClienteInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesGetAll) as Promise<readonly ClienteInterface[]>,

    create: (command: CrearClienteCommand): Promise<ClienteInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesCreate, command) as Promise<ClienteInterface>,

    getEstadisticas: (publicId: string): Promise<ClienteEstadisticasInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesGetEstadisticas,
        publicId,
      ) as Promise<ClienteEstadisticasInterface>,
  }),

  caja: Object.freeze({
    open: (command: AbrirCajaCommand): Promise<CajaAbiertaInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaOpen, command) as Promise<CajaAbiertaInterface>,
  }),

  reservas: Object.freeze({
    create: (command: CrearReservaCommand): Promise<string> =>
      ipcRenderer.invoke(IPC_CHANNELS.reservasCreate, command) as Promise<string>,

    getAll: (): Promise<readonly ReservaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.reservasGetAll) as Promise<readonly ReservaInterface[]>,

    deleteLinea: (publicId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.reservasDeleteLinea, publicId) as Promise<void>,

    deleteReserva: (publicId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.reservasDelete, publicId) as Promise<void>,
  }),

  ventas: Object.freeze({
    getContext: (): Promise<VentasContextInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasGetContext) as Promise<VentasContextInterface>,

    resolveArticulo: (codigo: string): Promise<ArticuloVentaInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ventasResolveArticulo,
        codigo,
      ) as Promise<ArticuloVentaInterface | null>,

    searchArticulos: (query: string): Promise<readonly ArticuloVentaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasSearchArticulos, query) as Promise<
        readonly ArticuloVentaInterface[]
      >,

    getAccesosDirectos: (): Promise<readonly AccesoDirectoVentaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasGetAccesosDirectos) as Promise<
        readonly AccesoDirectoVentaInterface[]
      >,

    getDevolucion: (idVenta: number): Promise<VentaDevolucionInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ventasGetDevolucion,
        idVenta,
      ) as Promise<VentaDevolucionInterface | null>,

    getHistorico: (consulta: VentaHistoricoConsulta): Promise<VentasHistoricoResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ventasGetHistorico,
        consulta,
      ) as Promise<VentasHistoricoResultado>,

    getHistoricoDetalle: (idVenta: number): Promise<VentaHistoricoDetalle | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ventasGetHistoricoDetalle,
        idVenta,
      ) as Promise<VentaHistoricoDetalle | null>,

    cambiarCliente: (
      command: VentaPostventaCambiarClienteCommand,
    ): Promise<VentaHistoricoDetalle> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ventasCambiarCliente,
        command,
      ) as Promise<VentaHistoricoDetalle>,

    cambiarTipoPago: (
      command: VentaPostventaCambiarTipoPagoCommand,
    ): Promise<VentaHistoricoDetalle> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ventasCambiarTipoPago,
        command,
      ) as Promise<VentaHistoricoDetalle>,

    getTicket: (idVenta: number): Promise<VentaTicketInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ventasGetTicket,
        idVenta,
      ) as Promise<VentaTicketInterface | null>,

    getTicketPdf: (idVenta: number): Promise<Uint8Array | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasGetTicketPdf, idVenta) as Promise<Uint8Array | null>,

    saveTicketPdf: (idVenta: number, ticketRevision: number, pdf: Uint8Array): Promise<void> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.ventasSaveTicketPdf,
        idVenta,
        ticketRevision,
        pdf,
      ) as Promise<void>,

    sendTicketEmail: (command: VentaTicketEmailCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasSendTicketEmail, command) as Promise<void>,

    processTicketBai: (idVenta: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasProcessTicketBai, idVenta) as Promise<void>,

    reconcileTicketBai: (idVenta: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasReconcileTicketBai, idVenta) as Promise<void>,

    retryTicketBai: (idVenta: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasRetryTicketBai, idVenta) as Promise<void>,

    save: (command: GuardarVentaCommand): Promise<GuardarVentaResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.ventasSave, command) as Promise<GuardarVentaResult>,
  }),
});

contextBridge.exposeInMainWorld('osumiDesktop', desktopApi);
