import { join } from 'node:path';

import ApplicationStateService from '@backend/application/application/application-state.service';
import CajaService from '@backend/application/caja/caja.service';
import CategoriasService from '@backend/application/categorias/categorias.service';
import ClientesService from '@backend/application/clientes/clientes.service';
import ConfigurationService from '@backend/application/configuration/configuration.service';
import InstallationService from '@backend/application/configuration/installation.service';
import EmpleadosService from '@backend/application/empleados/empleados.service';
import LegacyImportService from '@backend/application/legacy-import/legacy-import.service';
import MarcasService from '@backend/application/marcas/marcas.service';
import PrintingService from '@backend/application/printing/printing.service';
import ProveedoresService from '@backend/application/proveedores/proveedores.service';
import ReservasService from '@backend/application/reservas/reservas.service';
import { SystemService } from '@backend/application/system/system.service';
import VentasArticulosService from '@backend/application/ventas/ventas-articulos.service';
import VentasContextService from '@backend/application/ventas/ventas-context.service';
import VentasDevolucionesService from '@backend/application/ventas/ventas-devoluciones.service';
import VentasPersistenciaService from '@backend/application/ventas/ventas-persistencia.service';
import VentasTicketsService from '@backend/application/ventas/ventas-tickets.service';
import type CajaRepository from '@backend/contracts/caja/caja.repository.interface';
import type CategoriaRepository from '@backend/contracts/categorias/categoria.repository.interface';
import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type InstallationDatabase from '@backend/contracts/configuration/installation-database.interface';
import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type InstallationStaging from '@backend/contracts/configuration/installation-staging.interface';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type EmpleadoRepository from '@backend/contracts/empleados/empleado.repository.interface';
import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type HtmlDocumentRenderer from '@backend/contracts/printing/html-document-renderer.interface';
import type PrinterProvider from '@backend/contracts/printing/printer.provider.interface';
import type PrintingSettingsRepository from '@backend/contracts/printing/printing-settings.repository.interface';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type ReservasRepository from '@backend/contracts/reservas/reservas.repository.interface';
import type PasswordHasher from '@backend/contracts/security/password-hasher.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';
import type VentasArticulosRepository from '@backend/contracts/ventas/ventas-articulos.repository.interface';
import type VentasContextRepository from '@backend/contracts/ventas/ventas-context.repository.interface';
import type VentasDevolucionesRepository from '@backend/contracts/ventas/ventas-devoluciones.repository.interface';
import type VentasPersistenciaRepository from '@backend/contracts/ventas/ventas-persistencia.repository.interface';
import type VentasTicketsRepository from '@backend/contracts/ventas/ventas-tickets.repository.interface';
import DefaultLegacyImportReviewDecisionValidator from '@backend/domain/legacy-import/default-legacy-import-review-decision.validator';
import NewInstallationDataService from '@infrastructure/database/initial-data/new-installation-data.service';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import completeDatabaseSchemaTables from '@infrastructure/database/schema/complete-database-schema.tables';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmCajaRepository from '@infrastructure/database/typeorm/typeorm-caja.repository';
import TypeOrmCategoriaRepository from '@infrastructure/database/typeorm/typeorm-categoria.repository';
import TypeOrmClienteRepository from '@infrastructure/database/typeorm/typeorm-cliente.repository';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmEmpleadoRepository from '@infrastructure/database/typeorm/typeorm-empleado.repository';
import TypeOrmInstallationDatabase from '@infrastructure/database/typeorm/typeorm-installation-database';
import TypeOrmMarcaRepository from '@infrastructure/database/typeorm/typeorm-marca.repository';
import TypeOrmProveedorRepository from '@infrastructure/database/typeorm/typeorm-proveedor.repository';
import TypeOrmReservasRepository from '@infrastructure/database/typeorm/typeorm-reservas.repository';
import TypeOrmVentasArticulosRepository from '@infrastructure/database/typeorm/typeorm-ventas-articulos.repository';
import TypeOrmVentasContextRepository from '@infrastructure/database/typeorm/typeorm-ventas-context.repository';
import TypeOrmVentasDevolucionesRepository from '@infrastructure/database/typeorm/typeorm-ventas-devoluciones.repository';
import TypeOrmVentasPersistenciaRepository from '@infrastructure/database/typeorm/typeorm-ventas-persistencia.repository';
import TypeOrmVentasTicketsRepository from '@infrastructure/database/typeorm/typeorm-ventas-tickets.repository';
import ElectronAssetUrlBuilder from '@infrastructure/electron/electron-asset-url.builder';
import ElectronHtmlDocumentRenderer from '@infrastructure/electron/electron-html-document.renderer';
import ElectronLegacyImportDialog from '@infrastructure/electron/electron-legacy-import-dialog';
import ElectronLogoStorage from '@infrastructure/electron/electron-logo.storage';
import ElectronPrinterProvider from '@infrastructure/electron/electron-printer.provider';
import { ElectronRuntimeInfoProvider } from '@infrastructure/electron/electron-runtime-info.provider';
import ElectronSafeStorageSecretStorage from '@infrastructure/electron/electron-safe-storage-secret-storage';
import { getMainWindow } from '@infrastructure/electron/main-window';
import FileInstallationStaging from '@infrastructure/filesystem/file-installation-staging';
import JsonAppDataRepository from '@infrastructure/filesystem/json-app-data.repository';
import JsonPrintingSettingsRepository from '@infrastructure/filesystem/json-printing-settings.repository';
import InMemoryLegacyImportSelectionStore from '@infrastructure/legacy-import/in-memory-legacy-import-selection.store';
import MariaDbInsertParser from '@infrastructure/legacy-import/maria-db-insert.parser';
import NodeLegacyImportRunner from '@infrastructure/legacy-import/node-legacy-import.runner';
import YauzlLegacyImportDumpAnalyzer from '@infrastructure/legacy-import/yauzl-legacy-import-dump.analyzer';
import YauzlLegacyImportPackageConfigurationReader from '@infrastructure/legacy-import/yauzl-legacy-import-package-configuration.reader';
import YauzlLegacyImportPackageInspector from '@infrastructure/legacy-import/yauzl-legacy-import-package.inspector';
import NodeScryptPasswordHasher from '@infrastructure/security/node-scrypt-password-hasher';
import registerApplicationIpc from '@ipc/register-application-ipc';
import registerCajaIpc from '@ipc/register-caja-ipc';
import registerCategoriasIpc from '@ipc/register-categorias-ipc';
import registerClientesIpc from '@ipc/register-clientes-ipc';
import registerConfigurationIpc from '@ipc/register-configuration-ipc';
import registerEmpleadosIpc from '@ipc/register-empleados-ipc';
import registerLegacyImportIpc from '@ipc/register-legacy-import-ipc';
import registerMarcasIpc from '@ipc/register-marcas-ipc';
import registerPrintingIpc from '@ipc/register-printing-ipc';
import registerProveedoresIpc from '@ipc/register-proveedores-ipc';
import registerReservasIpc from '@ipc/register-reservas-ipc';
import { registerSystemIpc } from '@ipc/register-system-ipc';
import registerVentasIpc from '@ipc/register-ventas-ipc';

/**
 * Construye el grafo de dependencias de la aplicación,
 * registra sus canales IPC y devuelve la base operacional,
 * cuyo ciclo de vida pertenece al proceso principal.
 */
export default function createApplicationComposition(
  applicationPaths: ApplicationPaths,
  applicationVersion: string,
  installationFinalizer: InstallationFinalizer,
): TypeOrmApplicationDatabase {
  /*
   * Configuración definitiva.
   */
  const appDataRepository: AppDataRepository = new JsonAppDataRepository(
    applicationPaths.appDataFile,
  );

  const configurationService: ConfigurationService = new ConfigurationService(appDataRepository);

  /*
   * Almacenamiento temporal utilizado durante
   * una nueva instalación.
   */
  const stagingAppDataRepository: AppDataRepository = new JsonAppDataRepository(
    applicationPaths.stagingAppDataFile,
  );

  const stagingLogoStorage: LogoStorage = new ElectronLogoStorage(applicationPaths.stagingLogoFile);

  const stagingSecretStorage: SecretStorage = new ElectronSafeStorageSecretStorage(
    applicationPaths.stagingSecretsFile,
  );

  const installationStaging: InstallationStaging = new FileInstallationStaging(
    applicationPaths.stagingDirectory,
    applicationPaths.stagingFilesDirectory,
    stagingAppDataRepository,
    stagingLogoStorage,
    stagingSecretStorage,
  );

  /*
   * Infraestructura de SQLite.
   */
  const passwordHasher: PasswordHasher = new NodeScryptPasswordHasher();

  const dataSourceFactory: TypeOrmDataSourceFactory = new TypeOrmDataSourceFactory();

  const operationalDatabase: TypeOrmApplicationDatabase = new TypeOrmApplicationDatabase(
    applicationPaths.databaseFile,
    dataSourceFactory,
  );

  const databaseSchemaService: DatabaseSchemaService = new DatabaseSchemaService(
    completeDatabaseSchema,
    completeDatabaseSchemaTables,
  );

  const newInstallationDataService: NewInstallationDataService = new NewInstallationDataService();

  /*
   * Estado de la aplicación.
   */
  const applicationStateService: ApplicationStateService = new ApplicationStateService(
    applicationPaths.databaseFile,
    applicationPaths.appDataFile,
    dataSourceFactory,
    databaseSchemaService,
  );

  /*
   * Servicios operativos.
   */
  const assetUrlBuilder: AssetUrlBuilder = new ElectronAssetUrlBuilder();

  const marcaRepository: MarcaRepository = new TypeOrmMarcaRepository(operationalDatabase);
  const marcasService: MarcasService = new MarcasService(marcaRepository, assetUrlBuilder);

  const proveedorRepository: ProveedorRepository = new TypeOrmProveedorRepository(
    operationalDatabase,
  );
  const proveedoresService: ProveedoresService = new ProveedoresService(
    proveedorRepository,
    assetUrlBuilder,
  );

  const empleadoRepository: EmpleadoRepository = new TypeOrmEmpleadoRepository(operationalDatabase);
  const empleadosService: EmpleadosService = new EmpleadosService(empleadoRepository);

  const clienteRepository: ClienteRepository = new TypeOrmClienteRepository(operationalDatabase);
  const clientesService: ClientesService = new ClientesService(clienteRepository);

  const reservasRepository: ReservasRepository = new TypeOrmReservasRepository(operationalDatabase);
  const reservasService: ReservasService = new ReservasService(reservasRepository);

  const categoriaRepository: CategoriaRepository = new TypeOrmCategoriaRepository(
    operationalDatabase,
  );
  const categoriasService: CategoriasService = new CategoriasService(categoriaRepository);

  const cajaRepository: CajaRepository = new TypeOrmCajaRepository(operationalDatabase);
  const cajaService: CajaService = new CajaService(cajaRepository);

  const ventasArticulosRepository: VentasArticulosRepository = new TypeOrmVentasArticulosRepository(
    operationalDatabase,
  );

  const ventasArticulosService: VentasArticulosService = new VentasArticulosService(
    ventasArticulosRepository,
  );

  const ventasDevolucionesRepository: VentasDevolucionesRepository =
    new TypeOrmVentasDevolucionesRepository(operationalDatabase);

  const ventasDevolucionesService: VentasDevolucionesService = new VentasDevolucionesService(
    ventasDevolucionesRepository,
  );

  const ventasContextRepository: VentasContextRepository = new TypeOrmVentasContextRepository(
    operationalDatabase,
  );

  const ventasContextService: VentasContextService = new VentasContextService(
    configurationService,
    ventasContextRepository,
    assetUrlBuilder,
  );

  const ventasPersistenciaRepository: VentasPersistenciaRepository =
    new TypeOrmVentasPersistenciaRepository(operationalDatabase);

  const ventasPersistenciaService: VentasPersistenciaService = new VentasPersistenciaService(
    ventasPersistenciaRepository,
  );

  const ventasTicketsRepository: VentasTicketsRepository = new TypeOrmVentasTicketsRepository(
    operationalDatabase,
  );

  const ventasTicketsService: VentasTicketsService = new VentasTicketsService(
    ventasTicketsRepository,
  );

  /*
   * Importación legacy.
   */
  const legacyImportDialog: ElectronLegacyImportDialog = new ElectronLegacyImportDialog(
    getMainWindow,
  );

  const legacyImportPackageInspector: YauzlLegacyImportPackageInspector =
    new YauzlLegacyImportPackageInspector();

  const legacyImportPackageConfigurationReader: YauzlLegacyImportPackageConfigurationReader =
    new YauzlLegacyImportPackageConfigurationReader();

  const legacyImportSelectionStore: InMemoryLegacyImportSelectionStore =
    new InMemoryLegacyImportSelectionStore();

  const mariaDbInsertParser: MariaDbInsertParser = new MariaDbInsertParser();

  const legacyImportDumpAnalyzer: YauzlLegacyImportDumpAnalyzer = new YauzlLegacyImportDumpAnalyzer(
    mariaDbInsertParser,
  );

  const legacyImportReviewDecisionValidator: DefaultLegacyImportReviewDecisionValidator =
    new DefaultLegacyImportReviewDecisionValidator();

  const legacyImportRunner: NodeLegacyImportRunner = new NodeLegacyImportRunner(
    join(__dirname, 'legacy-import-worker.js'),
    applicationPaths.stagingDatabaseFile,
    applicationPaths.stagingFilesDirectory,
    applicationVersion,
  );

  const legacyImportService: LegacyImportService = new LegacyImportService(
    legacyImportDialog,
    legacyImportPackageInspector,
    legacyImportPackageConfigurationReader,
    legacyImportDumpAnalyzer,
    legacyImportReviewDecisionValidator,
    legacyImportRunner,
    legacyImportSelectionStore,
    stagingAppDataRepository,
    stagingLogoStorage,
    stagingSecretStorage,
    installationFinalizer,
  );

  /*
   * Creación de una nueva instalación.
   */
  const installationDatabase: InstallationDatabase = new TypeOrmInstallationDatabase(
    applicationPaths.stagingDatabaseFile,
    applicationVersion,
    passwordHasher,
    dataSourceFactory,
    databaseSchemaService,
    newInstallationDataService,
  );

  const installationService: InstallationService = new InstallationService(
    configurationService,
    installationStaging,
    installationDatabase,
    installationFinalizer,
  );

  /*
   * Sistema.
   */
  const runtimeInfoProvider: ElectronRuntimeInfoProvider = new ElectronRuntimeInfoProvider();
  const systemService: SystemService = new SystemService(runtimeInfoProvider);

  /*
   * Impresión y configuración local del terminal.
   */
  const printingSettingsRepository: PrintingSettingsRepository = new JsonPrintingSettingsRepository(
    applicationPaths.printingSettingsFile,
  );

  const printerProvider: PrinterProvider = new ElectronPrinterProvider(getMainWindow);

  const htmlDocumentRenderer: HtmlDocumentRenderer = new ElectronHtmlDocumentRenderer();

  const printingService: PrintingService = new PrintingService(
    printingSettingsRepository,
    printerProvider,
    htmlDocumentRenderer,
  );

  /*
   * Canales IPC.
   */
  registerApplicationIpc(applicationStateService);

  registerMarcasIpc(getMainWindow, marcasService);
  registerProveedoresIpc(getMainWindow, proveedoresService);
  registerEmpleadosIpc(getMainWindow, empleadosService);
  registerClientesIpc(getMainWindow, clientesService);
  registerCategoriasIpc(getMainWindow, categoriasService);
  registerCajaIpc(getMainWindow, cajaService);
  registerReservasIpc(getMainWindow, reservasService);

  registerVentasIpc(
    getMainWindow,
    ventasContextService,
    ventasArticulosService,
    ventasDevolucionesService,
    ventasPersistenciaService,
    ventasTicketsService,
  );

  registerLegacyImportIpc(legacyImportService);
  registerSystemIpc(getMainWindow, systemService);
  registerPrintingIpc(getMainWindow, printingService);

  registerConfigurationIpc(getMainWindow, configurationService, installationService);

  return operationalDatabase;
}
