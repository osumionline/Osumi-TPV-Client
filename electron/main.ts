import 'reflect-metadata';

import { app, BrowserWindow, protocol } from 'electron';

import { join } from 'node:path';

import ApplicationStateService from '@backend/application/application/application-state.service';
import ClientesService from '@backend/application/clientes/clientes.service';
import ConfigurationService from '@backend/application/configuration/configuration.service';
import InstallationService from '@backend/application/configuration/installation.service';
import EmpleadosService from '@backend/application/empleados/empleados.service';
import MarcasService from '@backend/application/marcas/marcas.service';
import ProveedoresService from '@backend/application/proveedores/proveedores.service';
import { SystemService } from '@backend/application/system/system.service';

import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type AppDataRepository from '@backend/contracts/configuration/app-data.repository';
import type InstallationDatabase from '@backend/contracts/configuration/installation-database.interface';
import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type InstallationStaging from '@backend/contracts/configuration/installation-staging.interface';
import type LogoStorage from '@backend/contracts/configuration/logo-storage.interface';
import type SecretStorage from '@backend/contracts/configuration/secret-storage.interface';
import type EmpleadoRepository from '@backend/contracts/empleados/empleado.repository.interface';
import type MarcaRepository from '@backend/contracts/marcas/marca.repository.interface';
import type ProveedorRepository from '@backend/contracts/proveedores/proveedor.repository.interface';
import type PasswordHasher from '@backend/contracts/security/password-hasher.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import type AssetUrlBuilder from '@backend/contracts/system/asset-url-builder.interface';

import NewInstallationDataService from '@infrastructure/database/initial-data/new-installation-data.service';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import completeDatabaseSchemaTables from '@infrastructure/database/schema/complete-database-schema.tables';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmClienteRepository from '@infrastructure/database/typeorm/typeorm-cliente.repository';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmEmpleadoRepository from '@infrastructure/database/typeorm/typeorm-empleado.repository';
import TypeOrmInstallationDatabase from '@infrastructure/database/typeorm/typeorm-installation-database';
import TypeOrmMarcaRepository from '@infrastructure/database/typeorm/typeorm-marca.repository';
import TypeOrmProveedorRepository from '@infrastructure/database/typeorm/typeorm-proveedor.repository';

import ElectronApplicationPathsProvider from '@infrastructure/electron/electron-application-paths.provider';
import ElectronAssetUrlBuilder from '@infrastructure/electron/electron-asset-url.builder';
import ElectronLogoStorage from '@infrastructure/electron/electron-logo.storage';
import { ElectronRuntimeInfoProvider } from '@infrastructure/electron/electron-runtime-info.provider';
import ElectronSafeStorageSecretStorage from '@infrastructure/electron/electron-safe-storage-secret-storage';
import registerAssetsProtocol from '@infrastructure/electron/register-assets-protocol';

import ApplicationDirectoriesService from '@infrastructure/filesystem/application-directories.service';
import FileInstallationFinalizer from '@infrastructure/filesystem/file-installation-finalizer';
import FileInstallationStaging from '@infrastructure/filesystem/file-installation-staging';
import JsonAppDataRepository from '@infrastructure/filesystem/json-app-data.repository';

import NodeScryptPasswordHasher from '@infrastructure/security/node-scrypt-password-hasher';

import registerApplicationIpc from '@ipc/register-application-ipc';
import registerClientesIpc from '@ipc/register-clientes-ipc';
import registerConfigurationIpc from '@ipc/register-configuration-ipc';
import registerEmpleadosIpc from '@ipc/register-empleados-ipc';
import registerMarcasIpc from '@ipc/register-marcas-ipc';
import registerProveedoresIpc from '@ipc/register-proveedores-ipc';
import { registerSystemIpc } from '@ipc/register-system-ipc';

import LegacyImportService from '@backend/application/legacy-import/legacy-import.service';
import DefaultLegacyImportReviewDecisionValidator from '@backend/domain/legacy-import/default-legacy-import-review-decision.validator';
import ElectronLegacyImportDialog from '@infrastructure/electron/electron-legacy-import-dialog';
import InMemoryLegacyImportSelectionStore from '@infrastructure/legacy-import/in-memory-legacy-import-selection.store';
import MariaDbInsertParser from '@infrastructure/legacy-import/maria-db-insert.parser';
import NodeLegacyImportRunner from '@infrastructure/legacy-import/node-legacy-import.runner';
import YauzlLegacyImportDumpAnalyzer from '@infrastructure/legacy-import/yauzl-legacy-import-dump.analyzer';
import YauzlLegacyImportPackageConfigurationReader from '@infrastructure/legacy-import/yauzl-legacy-import-package-configuration.reader';
import YauzlLegacyImportPackageInspector from '@infrastructure/legacy-import/yauzl-legacy-import-package.inspector';
import registerLegacyImportIpc from '@ipc/register-legacy-import-ipc';

protocol.registerSchemesAsPrivileged([
  {
    scheme: 'osumi',
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
    },
  },
]);

const DEV_SERVER_URL: string | undefined = process.env['OSUMI_TPV_RENDERER_URL'];

let mainWindow: BrowserWindow | null = null;

let applicationDatabase: TypeOrmApplicationDatabase | null = null;

let applicationQuitPrepared: boolean = false;

const runtimeInfoProvider: ElectronRuntimeInfoProvider = new ElectronRuntimeInfoProvider();

const systemService: SystemService = new SystemService(runtimeInfoProvider);

async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,

    minWidth: 1024,
    minHeight: 700,

    show: false,
    autoHideMenuBar: true,

    webPreferences: {
      preload: join(__dirname, 'preload.js'),

      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow.once('ready-to-show', (): void => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.once('closed', (): void => {
    mainWindow = null;
  });

  if (DEV_SERVER_URL !== undefined && DEV_SERVER_URL.length > 0) {
    await mainWindow.loadURL(DEV_SERVER_URL);

    return;
  }

  await mainWindow.loadFile(
    join(__dirname, '..', 'dist', 'osumi-tpv-client', 'browser', 'index.html'),
  );
}

app.enableSandbox();

app
  .whenReady()
  .then(async (): Promise<void> => {
    const applicationVersion: string = app.getVersion();

    /*
     * Rutas y directorios de la aplicación.
     */
    const pathsProvider: ElectronApplicationPathsProvider = new ElectronApplicationPathsProvider();

    const applicationPaths: ApplicationPaths = pathsProvider.getPaths();

    const directoriesService: ApplicationDirectoriesService = new ApplicationDirectoriesService(
      applicationPaths,
    );

    await directoriesService.ensureDirectories();

    app.setAppLogsPath(applicationPaths.logsDirectory);

    registerAssetsProtocol(applicationPaths);

    /*
     * Recuperación de instalaciones interrumpidas.
     */
    const installationFinalizer: InstallationFinalizer = new FileInstallationFinalizer(
      applicationPaths,
    );

    await installationFinalizer.recover();

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

    const stagingLogoStorage: LogoStorage = new ElectronLogoStorage(
      applicationPaths.stagingLogoFile,
    );

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

    applicationDatabase = operationalDatabase;

    const databaseSchemaService: DatabaseSchemaService = new DatabaseSchemaService(
      completeDatabaseSchema,
      completeDatabaseSchemaTables,
    );

    const newInstallationDataService: NewInstallationDataService = new NewInstallationDataService();

    /*
     * Estado de la aplicación.
     *
     * Se crea después de disponer del DataSource
     * y del servicio de validación del esquema.
     */
    const applicationStateService: ApplicationStateService = new ApplicationStateService(
      applicationPaths.databaseFile,
      applicationPaths.appDataFile,
      dataSourceFactory,
      databaseSchemaService,
    );

    /*
     * Servicios operativos de catálogo.
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

    const empleadoRepository: EmpleadoRepository = new TypeOrmEmpleadoRepository(
      operationalDatabase,
    );

    const empleadosService: EmpleadosService = new EmpleadosService(empleadoRepository);

    const clienteRepository: ClienteRepository = new TypeOrmClienteRepository(operationalDatabase);

    const clientesService: ClientesService = new ClientesService(clienteRepository);

    const legacyImportDialog: ElectronLegacyImportDialog = new ElectronLegacyImportDialog(
      (): BrowserWindow | null => mainWindow,
    );

    const legacyImportPackageInspector: YauzlLegacyImportPackageInspector =
      new YauzlLegacyImportPackageInspector();

    const legacyImportPackageConfigurationReader: YauzlLegacyImportPackageConfigurationReader =
      new YauzlLegacyImportPackageConfigurationReader();

    const legacyImportSelectionStore: InMemoryLegacyImportSelectionStore =
      new InMemoryLegacyImportSelectionStore();

    const mariaDbInsertParser: MariaDbInsertParser = new MariaDbInsertParser();

    const legacyImportDumpAnalyzer: YauzlLegacyImportDumpAnalyzer =
      new YauzlLegacyImportDumpAnalyzer(mariaDbInsertParser);

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
     * Canales IPC.
     */
    registerApplicationIpc(applicationStateService);

    registerMarcasIpc(
      (): BrowserWindow | null => mainWindow,

      marcasService,
    );

    registerProveedoresIpc(
      (): BrowserWindow | null => mainWindow,

      proveedoresService,
    );

    registerEmpleadosIpc((): BrowserWindow | null => mainWindow, empleadosService);

    registerClientesIpc((): BrowserWindow | null => mainWindow, clientesService);

    registerLegacyImportIpc(legacyImportService);

    registerSystemIpc(
      (): BrowserWindow | null => mainWindow,

      systemService,
    );

    registerConfigurationIpc(
      (): BrowserWindow | null => mainWindow,

      configurationService,
      installationService,
    );

    /*
     * Ventana principal.
     */
    await createWindow();

    app.on('activate', (): void => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  })
  .catch((error: unknown): void => {
    console.error('Error iniciando Osumi TPV Client:', error);

    app.quit();
  });

app.on(
  'before-quit',

  (event): void => {
    if (applicationQuitPrepared || applicationDatabase === null) {
      return;
    }

    event.preventDefault();

    void applicationDatabase
      .disconnect()
      .catch((error: unknown): void => {
        console.error('No se ha podido cerrar la base de datos de la aplicación:', error);
      })
      .finally((): void => {
        applicationQuitPrepared = true;

        app.quit();
      });
  },
);

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
