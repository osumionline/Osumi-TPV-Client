import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidades/caducidad-create.interface';
import type { CaducidadReportConsulta } from '@desktop-contracts/almacen/caducidades/caducidad-report.interface';
import type {
  CaducidadConsulta,
  CaducidadFilterOptionsInterface,
  CaducidadResultado,
} from '@desktop-contracts/almacen/caducidades/caducidad.interface';
import type {
  ImprentaArticuloSearchConsulta,
  ImprentaArticuloSearchInterface,
} from '@desktop-contracts/almacen/imprenta/imprenta-articulo.interface';
import type { ImprentaPrintCommand } from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';
import type {
  InventarioCsvExportResult,
  InventarioReportConsulta,
} from '@desktop-contracts/almacen/inventario/inventario-report.interface';
import type { InventarioSaveCommand } from '@desktop-contracts/almacen/inventario/inventario-save.interface';
import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario/inventario.interface';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import type ArticuloAccesoDirectoCommand from '@desktop-contracts/articulos/articulo-acceso-directo-command.interface';
import type ArticuloAccesoDirectoInterface from '@desktop-contracts/articulos/articulo-acceso-directo.interface';
import type {
  ArticuloEstadisticasConsulta,
  ArticuloEstadisticasResultado,
} from '@desktop-contracts/articulos/articulo-estadisticas.interface';
import type {
  ArticuloHistoricoConsulta,
  ArticuloHistoricoResultado,
} from '@desktop-contracts/articulos/articulo-historico.interface';
import type { ArticuloSaveInterface } from '@desktop-contracts/articulos/articulo-save.interface';
import type { ArticuloInterface } from '@desktop-contracts/articulos/articulo.interface';
import type CategoriaInterface from '@desktop-contracts/articulos/categorias/categoria.interface';
import type BackupCreateResult from '@desktop-contracts/backup/backup-create-result.interface';
import type BackupRestoreFinalizeResult from '@desktop-contracts/backup/backup-restore-finalize-result.interface';
import type BackupRestorePackageSelectionResult from '@desktop-contracts/backup/backup-restore-package-selection-result.type';
import type BackupRestoreUnlockCommand from '@desktop-contracts/backup/backup-restore-unlock-command.interface';
import type BackupRestoreUnlockResult from '@desktop-contracts/backup/backup-restore-unlock-result.interface';
import type AbrirCajaCommand from '@desktop-contracts/caja/abrir-caja-command.interface';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import {
  type CajaCierreInterface,
  CajaCierreConsulta,
} from '@desktop-contracts/caja/caja-cierre.interface';
import type { CerrarCajaCommand } from '@desktop-contracts/caja/cerrar-caja-command.interface';
import type { InformeDetalladoConsulta } from '@desktop-contracts/caja/informes/informe-detallado.interface';
import type { InformeSimpleConsulta } from '@desktop-contracts/caja/informes/informe-simple.interface';
import type { InformeVentasConsulta } from '@desktop-contracts/caja/informes/informe-ventas.interface';
import type {
  ActualizarSalidaCajaCommand,
  CrearSalidaCajaCommand,
  EliminarSalidaCajaCommand,
} from '@desktop-contracts/caja/salida-caja-command.interface';
import type {
  SalidaCajaConsulta,
  SalidaCajaInterface,
} from '@desktop-contracts/caja/salida-caja.interface';
import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type ActualizarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/actualizar-cliente-factura-borrador-command.interface';
import type AnularClienteFacturaCommand from '@desktop-contracts/clientes/anular-cliente-factura-command.interface';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type { ClienteFacturaDocumentoConsulta } from '@desktop-contracts/clientes/cliente-factura-documento.interface';
import type ClienteFacturaEmailCommand from '@desktop-contracts/clientes/cliente-factura-email-command.interface';
import type {
  ClienteFacturaVentaDisponibleInterface,
  ClienteFacturaVentaInterface,
  ClienteFacturaVentasConsulta,
  ClienteFacturaVentasDisponiblesConsulta,
} from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';
import type CrearClienteFacturaDesdeVentaCommand from '@desktop-contracts/clientes/crear-cliente-factura-desde-venta-command.interface';
import type EliminarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/eliminar-cliente-factura-borrador-command.interface';
import type EmitirClienteFacturaCommand from '@desktop-contracts/clientes/emitir-cliente-factura-command.interface';
import type ActualizarMarcaCommand from '@desktop-contracts/compras/marcas/actualizar-marca-command.interface';
import type CrearMarcaCommand from '@desktop-contracts/compras/marcas/crear-marca-command.interface';
import type {
  MarcaEstadisticasConsulta,
  MarcaEstadisticasResultado,
} from '@desktop-contracts/compras/marcas/marca-estadisticas.interface';
import type MarcaInterface from '@desktop-contracts/compras/marcas/marca.interface';
import type { PedidoArchivoInterface } from '@desktop-contracts/compras/pedidos/pedido-archivo.interface';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
import type {
  PedidoFilterOptionsInterface,
  PedidoListadoConsulta,
  PedidosGuardadosResultado,
  PedidosRecepcionadosResultado,
} from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import type ActualizarComercialCommand from '@desktop-contracts/compras/proveedores/actualizar-comercial-command.interface';
import type ActualizarProveedorCommand from '@desktop-contracts/compras/proveedores/actualizar-proveedor-command.interface';
import type CrearComercialCommand from '@desktop-contracts/compras/proveedores/crear-comercial-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/compras/proveedores/crear-proveedor-command.interface';
import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/compras/proveedores/proveedor.interface';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import type ActualizarEmpleadoCommand from '@desktop-contracts/configuration/empleados/actualizar-empleado-command.interface';
import type AutenticarEmpleadoCommand from '@desktop-contracts/configuration/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type CrearEmpleadoCommand from '@desktop-contracts/configuration/empleados/crear-empleado-command.interface';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';
import type PrinterInterface from '@desktop-contracts/configuration/printing/printer.interface';
import type PrintingSettings from '@desktop-contracts/configuration/printing/printing-settings.interface';
import type RevealableConfigurationSecret from '@desktop-contracts/configuration/revealable-configuration-secret.type';
import type ActualizarTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/actualizar-tipo-pago-command.interface';
import type CrearTipoPagoCommand from '@desktop-contracts/configuration/tipos-pago/crear-tipo-pago-command.interface';
import type ReordenarTiposPagoCommand from '@desktop-contracts/configuration/tipos-pago/reordenar-tipos-pago-command.interface';
import type {
  TipoPagoEstadisticasConsulta,
  TipoPagoEstadisticasResultado,
} from '@desktop-contracts/configuration/tipos-pago/tipo-pago-estadisticas.interface';
import type TipoPagoInterface from '@desktop-contracts/configuration/tipos-pago/tipo-pago.interface';
import OsumiDesktopApi from '@desktop-contracts/desktop-api';
import type StageImageRequest from '@desktop-contracts/files/stage-image-request.interface';
import type StagedImageInterface from '@desktop-contracts/files/staged-image.interface';
import type LegacyImportAnalysisReport from '@desktop-contracts/legacy-import/legacy-import-analysis-report.interface';
import type LegacyImportPackageSelectionResult from '@desktop-contracts/legacy-import/legacy-import-package-selection-result.type';
import type LegacyImportPreparationResult from '@desktop-contracts/legacy-import/legacy-import-preparation-result.interface';
import type LegacyImportProgress from '@desktop-contracts/legacy-import/legacy-import-progress.interface';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';
import type LegacyImportStartResult from '@desktop-contracts/legacy-import/legacy-import-start-result.interface';
import AppInfo from '@desktop-contracts/system/app-info.interface';
import type AccesoDirectoVentaInterface from '@desktop-contracts/ventas/acceso-directo-venta.interface';
import type ArticuloVentaInterface from '@desktop-contracts/ventas/articulo-venta.interface';
import type { GuardarVentaCommand } from '@desktop-contracts/ventas/guardar-venta-command.interface';
import type GuardarVentaResult from '@desktop-contracts/ventas/guardar-venta-result.interface';
import type CrearReservaCommand from '@desktop-contracts/ventas/reservas/crear-reserva-command.interface';
import type ReservaInterface from '@desktop-contracts/ventas/reservas/reserva.interface';
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

  backup: Object.freeze({
    createLocal: (): Promise<BackupCreateResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.backupCreateLocal) as Promise<BackupCreateResult>,

    selectRestorePackage: (): Promise<BackupRestorePackageSelectionResult> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.backupSelectRestorePackage,
      ) as Promise<BackupRestorePackageSelectionResult>,

    unlockRestorePackage: (
      command: BackupRestoreUnlockCommand,
    ): Promise<BackupRestoreUnlockResult> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.backupUnlockRestorePackage,
        command,
      ) as Promise<BackupRestoreUnlockResult>,

    finalizeRestorePackage: (selectionId: string): Promise<BackupRestoreFinalizeResult> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.backupFinalizeRestorePackage,
        selectionId,
      ) as Promise<BackupRestoreFinalizeResult>,
  }),

  almacen: Object.freeze({
    searchInventario: (consulta: InventarioConsulta): Promise<InventarioResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.almacenSearchInventario,
        consulta,
      ) as Promise<InventarioResultado>,

    exportInventarioCsv: (consulta: InventarioReportConsulta): Promise<InventarioCsvExportResult> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.almacenExportInventarioCsv,
        consulta,
      ) as Promise<InventarioCsvExportResult>,

    openInventarioPrint: (consulta: InventarioReportConsulta): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenOpenInventarioPrint, consulta) as Promise<void>,

    saveInventarioRow: (command: InventarioSaveCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenSaveInventarioRow, command) as Promise<void>,

    saveInventarioRows: (commands: readonly InventarioSaveCommand[]): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenSaveInventarioRows, commands) as Promise<void>,

    deactivateArticulo: (idArticulo: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenDeactivateArticulo, idArticulo) as Promise<void>,

    searchCaducidades: (consulta: CaducidadConsulta): Promise<CaducidadResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.almacenSearchCaducidades,
        consulta,
      ) as Promise<CaducidadResultado>,

    getCaducidadFilterOptions: (): Promise<CaducidadFilterOptionsInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.almacenGetCaducidadFilterOptions,
      ) as Promise<CaducidadFilterOptionsInterface>,

    searchCaducidadArticulos: (
      texto: string,
    ): Promise<readonly CaducidadArticuloSearchInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenSearchCaducidadArticulos, texto) as Promise<
        readonly CaducidadArticuloSearchInterface[]
      >,

    createCaducidad: (command: CaducidadCreateCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenCreateCaducidad, command) as Promise<void>,
    deactivateCaducidad: (idCaducidad: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenDeactivateCaducidad, idCaducidad) as Promise<void>,
    openCaducidadReport: (consulta: CaducidadReportConsulta): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenOpenCaducidadReport, consulta) as Promise<void>,
    searchImprentaArticulos: (
      consulta: ImprentaArticuloSearchConsulta,
    ): Promise<readonly ImprentaArticuloSearchInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenSearchImprentaArticulos, consulta) as Promise<
        readonly ImprentaArticuloSearchInterface[]
      >,
    openImprentaPrint: (command: ImprentaPrintCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.almacenOpenImprentaPrint, command) as Promise<void>,
  }),

  compras: Object.freeze({
    searchPedidosGuardados: (consulta: PedidoListadoConsulta): Promise<PedidosGuardadosResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasSearchPedidosGuardados,
        consulta,
      ) as Promise<PedidosGuardadosResultado>,

    searchPedidosRecepcionados: (
      consulta: PedidoListadoConsulta,
    ): Promise<PedidosRecepcionadosResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasSearchPedidosRecepcionados,
        consulta,
      ) as Promise<PedidosRecepcionadosResultado>,

    getPedidoFilterOptions: (): Promise<PedidoFilterOptionsInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasGetPedidoFilterOptions,
      ) as Promise<PedidoFilterOptionsInterface>,

    getPedido: (idPedido: number): Promise<PedidoCabeceraInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasGetPedido,
        idPedido,
      ) as Promise<PedidoCabeceraInterface | null>,

    getPedidoLineas: (idPedido: number): Promise<readonly PedidoLineaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.comprasGetPedidoLineas, idPedido) as Promise<
        readonly PedidoLineaInterface[]
      >,

    getPedidoArchivos: (idPedido: number): Promise<readonly PedidoArchivoInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.comprasGetPedidoArchivos, idPedido) as Promise<
        readonly PedidoArchivoInterface[]
      >,

    attachPedidoPdf: (idPedido: number): Promise<PedidoArchivoInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasAttachPedidoPdf,
        idPedido,
      ) as Promise<PedidoArchivoInterface | null>,

    openPedidoPdf: (idPedido: number, idPedidoArchivo: number): Promise<void> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasOpenPedidoPdf,
        idPedido,
        idPedidoArchivo,
      ) as Promise<void>,

    deletePedidoPdf: (idPedido: number, idPedidoArchivo: number): Promise<void> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasDeletePedidoPdf,
        idPedido,
        idPedidoArchivo,
      ) as Promise<void>,

    getPedidoFormOptions: (): Promise<PedidoFormOptionsInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasGetPedidoFormOptions,
      ) as Promise<PedidoFormOptionsInterface>,

    savePedido: (command: PedidoSaveCommand): Promise<number> =>
      ipcRenderer.invoke(IPC_CHANNELS.comprasSavePedido, command) as Promise<number>,

    deletePedido: (idPedido: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.comprasDeletePedido, idPedido) as Promise<void>,

    recepcionarPedido: (idPedido: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.comprasRecepcionarPedido, idPedido) as Promise<void>,

    getPedidoArticuloById: (idArticulo: number): Promise<PedidoArticuloInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasGetPedidoArticuloById,
        idArticulo,
      ) as Promise<PedidoArticuloInterface | null>,

    resolvePedidoArticulo: (codigo: string): Promise<PedidoArticuloInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.comprasResolvePedidoArticulo,
        codigo,
      ) as Promise<PedidoArticuloInterface | null>,

    searchPedidoArticulos: (texto: string): Promise<readonly PedidoArticuloInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.comprasSearchPedidoArticulos, texto) as Promise<
        readonly PedidoArticuloInterface[]
      >,
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
    getAppData: (): Promise<AppData | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationGetAppData) as Promise<AppData | null>,

    revealSecret: (secret: RevealableConfigurationSecret): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationRevealSecret, secret) as Promise<string | null>,

    updateAppData: (command: ConfigurationUpdateCommand): Promise<AppData> =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationUpdateAppData, command) as Promise<AppData>,

    install: (command: InstallationCommand): Promise<InstallationResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationInstall, command) as Promise<InstallationResult>,
  }),

  files: Object.freeze({
    stageArticleImage: (request: StageImageRequest): Promise<StagedImageInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.filesStageArticleImage,
        request,
      ) as Promise<StagedImageInterface>,

    stageBrandImage: (request: StageImageRequest): Promise<StagedImageInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.filesStageBrandImage,
        request,
      ) as Promise<StagedImageInterface>,

    stageProviderImage: (request: StageImageRequest): Promise<StagedImageInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.filesStageProviderImage,
        request,
      ) as Promise<StagedImageInterface>,

    stagePaymentTypeImage: (request: StageImageRequest): Promise<StagedImageInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.filesStagePaymentTypeImage,
        request,
      ) as Promise<StagedImageInterface>,

    discardStagedImage: (stagingId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.filesDiscardStagedImage, stagingId) as Promise<void>,
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

    getById: (id: number): Promise<MarcaInterface | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.marcasGetById, id) as Promise<MarcaInterface | null>,

    getEstadisticas: (consulta: MarcaEstadisticasConsulta): Promise<MarcaEstadisticasResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.marcasGetEstadisticas,
        consulta,
      ) as Promise<MarcaEstadisticasResultado>,

    create: (command: CrearMarcaCommand): Promise<MarcaInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.marcasCreate, command) as Promise<MarcaInterface>,

    update: (id: number, command: ActualizarMarcaCommand): Promise<MarcaInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.marcasUpdate, id, command) as Promise<MarcaInterface>,

    deactivate: (id: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.marcasDeactivate, id) as Promise<void>,
  }),

  proveedores: Object.freeze({
    getAll: (): Promise<readonly ProveedorInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.proveedoresGetAll) as Promise<readonly ProveedorInterface[]>,

    getById: (id: number): Promise<ProveedorInterface | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.proveedoresGetById, id) as Promise<ProveedorInterface | null>,

    create: (command: CrearProveedorCommand): Promise<ProveedorInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.proveedoresCreate, command) as Promise<ProveedorInterface>,

    update: (id: number, command: ActualizarProveedorCommand): Promise<ProveedorInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.proveedoresUpdate,
        id,
        command,
      ) as Promise<ProveedorInterface>,

    deactivate: (id: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.proveedoresDeactivate, id) as Promise<void>,

    createComercial: (
      idProveedor: number,
      command: CrearComercialCommand,
    ): Promise<ComercialInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.proveedoresCreateComercial,
        idProveedor,
        command,
      ) as Promise<ComercialInterface>,

    updateComercial: (
      idProveedor: number,
      idComercial: number,
      command: ActualizarComercialCommand,
    ): Promise<ComercialInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.proveedoresUpdateComercial,
        idProveedor,
        idComercial,
        command,
      ) as Promise<ComercialInterface>,

    deactivateComercial: (idProveedor: number, idComercial: number): Promise<void> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.proveedoresDeactivateComercial,
        idProveedor,
        idComercial,
      ) as Promise<void>,
  }),

  tiposPago: Object.freeze({
    getAll: (): Promise<readonly TipoPagoInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.tiposPagoGetAll) as Promise<readonly TipoPagoInterface[]>,

    getEstadisticas: (
      consulta: TipoPagoEstadisticasConsulta,
    ): Promise<TipoPagoEstadisticasResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.tiposPagoGetEstadisticas,
        consulta,
      ) as Promise<TipoPagoEstadisticasResultado>,

    create: (command: CrearTipoPagoCommand): Promise<TipoPagoInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.tiposPagoCreate, command) as Promise<TipoPagoInterface>,

    update: (id: number, command: ActualizarTipoPagoCommand): Promise<TipoPagoInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.tiposPagoUpdate, id, command) as Promise<TipoPagoInterface>,

    reorder: (command: ReordenarTiposPagoCommand): Promise<readonly TipoPagoInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.tiposPagoReorder, command) as Promise<
        readonly TipoPagoInterface[]
      >,

    deactivate: (id: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.tiposPagoDeactivate, id) as Promise<void>,
  }),

  empleados: Object.freeze({
    getAll: (): Promise<readonly EmpleadoInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.empleadosGetAll) as Promise<readonly EmpleadoInterface[]>,

    authenticate: (command: AutenticarEmpleadoCommand): Promise<AutenticarEmpleadoResult> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.empleadosAuthenticate,
        command,
      ) as Promise<AutenticarEmpleadoResult>,

    create: (command: CrearEmpleadoCommand): Promise<EmpleadoInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.empleadosCreate, command) as Promise<EmpleadoInterface>,

    update: (idEmpleado: number, command: ActualizarEmpleadoCommand): Promise<EmpleadoInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.empleadosUpdate,
        idEmpleado,
        command,
      ) as Promise<EmpleadoInterface>,

    deactivate: (idEmpleado: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.empleadosDeactivate, idEmpleado) as Promise<void>,
  }),

  categorias: Object.freeze({
    getAll: (): Promise<readonly CategoriaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.categoriasGetAll) as Promise<readonly CategoriaInterface[]>,
  }),

  articulos: Object.freeze({
    getById: (idArticulo: number): Promise<ArticuloInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.articulosGetById,
        idArticulo,
      ) as Promise<ArticuloInterface | null>,

    resolveByCode: (codigo: string): Promise<ArticuloInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.articulosResolveByCode,
        codigo,
      ) as Promise<ArticuloInterface | null>,

    getHistorico: (consulta: ArticuloHistoricoConsulta): Promise<ArticuloHistoricoResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.articulosGetHistorico,
        consulta,
      ) as Promise<ArticuloHistoricoResultado>,

    getEstadisticas: (
      consulta: ArticuloEstadisticasConsulta,
    ): Promise<ArticuloEstadisticasResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.articulosGetEstadisticas,
        consulta,
      ) as Promise<ArticuloEstadisticasResultado>,

    getAccesosDirectos: (): Promise<readonly ArticuloAccesoDirectoInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.articulosGetAccesosDirectos) as Promise<
        readonly ArticuloAccesoDirectoInterface[]
      >,

    setAccesoDirecto: (command: ArticuloAccesoDirectoCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.articulosSetAccesoDirecto, command) as Promise<void>,

    save: (command: ArticuloSaveInterface): Promise<ArticuloInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.articulosSave, command) as Promise<ArticuloInterface>,

    deactivate: (idArticulo: number): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.articulosDeactivate, idArticulo) as Promise<void>,
  }),

  clientes: Object.freeze({
    getAll: (): Promise<readonly ClienteInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesGetAll) as Promise<readonly ClienteInterface[]>,

    create: (command: CrearClienteCommand): Promise<ClienteInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesCreate, command) as Promise<ClienteInterface>,

    update: (command: ActualizarClienteCommand): Promise<ClienteInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesUpdate, command) as Promise<ClienteInterface>,

    deactivate: (publicId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesDeactivate, publicId) as Promise<void>,

    getFacturas: (publicId: string): Promise<readonly ClienteFacturaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesGetFacturas, publicId) as Promise<
        readonly ClienteFacturaInterface[]
      >,

    createFacturaBorrador: (
      command: CrearClienteFacturaBorradorCommand,
    ): Promise<ClienteFacturaInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesCreateFacturaBorrador,
        command,
      ) as Promise<ClienteFacturaInterface>,

    updateFacturaBorrador: (
      command: ActualizarClienteFacturaBorradorCommand,
    ): Promise<ClienteFacturaInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesUpdateFacturaBorrador,
        command,
      ) as Promise<ClienteFacturaInterface>,

    deleteFacturaBorrador: (command: EliminarClienteFacturaBorradorCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesDeleteFacturaBorrador, command) as Promise<void>,

    emitFacturaBorrador: (command: EmitirClienteFacturaCommand): Promise<ClienteFacturaInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesEmitFacturaBorrador,
        command,
      ) as Promise<ClienteFacturaInterface>,

    createFacturaDesdeVenta: (
      command: CrearClienteFacturaDesdeVentaCommand,
    ): Promise<ClienteFacturaInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesCreateFacturaDesdeVenta,
        command,
      ) as Promise<ClienteFacturaInterface>,

    anularFactura: (command: AnularClienteFacturaCommand): Promise<ClienteFacturaInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesAnularFactura,
        command,
      ) as Promise<ClienteFacturaInterface>,

    openFacturaPreview: (
      consulta: ClienteFacturaDocumentoConsulta,
    ): Promise<ClienteFacturaInterface | null> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesOpenFacturaPreview,
        consulta,
      ) as Promise<ClienteFacturaInterface | null>,

    printFactura: (consulta: ClienteFacturaDocumentoConsulta): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesPrintFactura, consulta) as Promise<void>,

    emailFactura: (command: ClienteFacturaEmailCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesEmailFactura, command) as Promise<void>,

    getFacturaVentas: (
      consulta: ClienteFacturaVentasConsulta,
    ): Promise<readonly ClienteFacturaVentaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesGetFacturaVentas, consulta) as Promise<
        readonly ClienteFacturaVentaInterface[]
      >,

    getFacturaVentasDisponibles: (
      consulta: ClienteFacturaVentasDisponiblesConsulta,
    ): Promise<readonly ClienteFacturaVentaDisponibleInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.clientesGetFacturaVentasDisponibles, consulta) as Promise<
        readonly ClienteFacturaVentaDisponibleInterface[]
      >,

    getEstadisticas: (publicId: string): Promise<ClienteEstadisticasInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesGetEstadisticas,
        publicId,
      ) as Promise<ClienteEstadisticasInterface>,

    getEstadisticasGenerales: (publicId: string): Promise<ClienteEstadisticasGeneralesInterface> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesGetEstadisticasGenerales,
        publicId,
      ) as Promise<ClienteEstadisticasGeneralesInterface>,

    getConsumoMensual: (
      consulta: ClienteConsumoMensualConsulta,
    ): Promise<ClienteConsumoMensualResultado> =>
      ipcRenderer.invoke(
        IPC_CHANNELS.clientesGetConsumoMensual,
        consulta,
      ) as Promise<ClienteConsumoMensualResultado>,
  }),

  caja: Object.freeze({
    open: (command: AbrirCajaCommand): Promise<CajaAbiertaInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaOpen, command) as Promise<CajaAbiertaInterface>,

    getSalidas: (consulta: SalidaCajaConsulta): Promise<readonly SalidaCajaInterface[]> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaGetSalidas, consulta) as Promise<
        readonly SalidaCajaInterface[]
      >,

    createSalida: (command: CrearSalidaCajaCommand): Promise<SalidaCajaInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaCreateSalida, command) as Promise<SalidaCajaInterface>,

    updateSalida: (command: ActualizarSalidaCajaCommand): Promise<SalidaCajaInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaUpdateSalida, command) as Promise<SalidaCajaInterface>,

    deleteSalida: (command: EliminarSalidaCajaCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaDeleteSalida, command) as Promise<void>,

    getCierre: (consulta: CajaCierreConsulta): Promise<CajaCierreInterface> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaGetCierre, consulta) as Promise<CajaCierreInterface>,

    close: (command: CerrarCajaCommand): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaClose, command) as Promise<void>,

    openInformeSimple: (consulta: InformeSimpleConsulta): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaOpenInformeSimple, consulta) as Promise<void>,

    openInformeDetallado: (consulta: InformeDetalladoConsulta): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaOpenInformeDetallado, consulta) as Promise<void>,

    openInformeVentas: (consulta: InformeVentasConsulta): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.cajaOpenInformeVentas, consulta) as Promise<void>,
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
