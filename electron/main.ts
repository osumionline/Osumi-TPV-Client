import ConfigurationService from '@backend/application/configuration/configuration.service';
import InstallationService from '@backend/application/configuration/installation.service';
import { SystemService } from '@backend/application/system/system.service';
import type AppDataRepository from '@backend/contracts/app-data.repository';
import type ApplicationPaths from '@backend/contracts/application-paths.interface';
import type InstallationDatabase from '@backend/contracts/installation-database.interface';
import type InstallationFinalizer from '@backend/contracts/installation-finalizer.interface';
import type InstallationStaging from '@backend/contracts/installation-staging.interface';
import type LogoStorage from '@backend/contracts/logo-storage.interface';
import type PasswordHasher from '@backend/contracts/password-hasher.interface';
import type SecretStorage from '@backend/contracts/secret-storage.interface';
import NewInstallationDataService from '@infrastructure/database/initial-data/new-installation-data.service';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import completeDatabaseSchemaTables from '@infrastructure/database/schema/complete-database-schema.tables';
import DatabaseSchemaService from '@infrastructure/database/schema/database-schema.service';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import TypeOrmInstallationDatabase from '@infrastructure/database/typeorm/typeorm-installation-database';
import ElectronApplicationPathsProvider from '@infrastructure/electron/electron-application-paths.provider';
import ElectronLogoStorage from '@infrastructure/electron/electron-logo.storage';
import { ElectronRuntimeInfoProvider } from '@infrastructure/electron/electron-runtime-info.provider';
import ElectronSafeStorageSecretStorage from '@infrastructure/electron/electron-safe-storage-secret-storage';
import registerAssetsProtocol from '@infrastructure/electron/register-assets-protocol';
import ApplicationDirectoriesService from '@infrastructure/filesystem/application-directories.service';
import FileInstallationFinalizer from '@infrastructure/filesystem/file-installation-finalizer';
import FileInstallationStaging from '@infrastructure/filesystem/file-installation-staging';
import JsonAppDataRepository from '@infrastructure/filesystem/json-app-data.repository';
import NodeScryptPasswordHasher from '@infrastructure/security/node-scrypt-password-hasher';
import registerConfigurationIpc from '@ipc/register-configuration-ipc';
import { registerSystemIpc } from '@ipc/register-system-ipc';
import { app, BrowserWindow, protocol } from 'electron';
import { join } from 'node:path';
import 'reflect-metadata';

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

const DEV_SERVER_URL = process.env['OSUMI_TPV_RENDERER_URL'];

let mainWindow: BrowserWindow | null = null;
const runtimeInfoProvider = new ElectronRuntimeInfoProvider();
const systemService = new SystemService(runtimeInfoProvider);

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

  mainWindow.once('ready-to-show', () => {
    mainWindow?.maximize();
    mainWindow?.show();
  });

  mainWindow.once('closed', () => {
    mainWindow = null;
  });

  if (DEV_SERVER_URL) {
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
  .then(async () => {
    const applicationVersion: string = app.getVersion();
    const pathsProvider: ElectronApplicationPathsProvider = new ElectronApplicationPathsProvider();
    const applicationPaths: ApplicationPaths = pathsProvider.getPaths();
    const directoriesService: ApplicationDirectoriesService = new ApplicationDirectoriesService(
      applicationPaths,
    );

    await directoriesService.ensureDirectories();
    const installationFinalizer: InstallationFinalizer = new FileInstallationFinalizer(
      applicationPaths,
    );

    await installationFinalizer.recover();
    app.setAppLogsPath(applicationPaths.logsDirectory);
    registerAssetsProtocol(applicationPaths);

    const appDataRepository: AppDataRepository = new JsonAppDataRepository(
      applicationPaths.appDataFile,
    );
    const configurationService: ConfigurationService = new ConfigurationService(appDataRepository);
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
      stagingAppDataRepository,
      stagingLogoStorage,
      stagingSecretStorage,
    );
    const passwordHasher: PasswordHasher = new NodeScryptPasswordHasher();
    const dataSourceFactory: TypeOrmDataSourceFactory = new TypeOrmDataSourceFactory();
    const databaseSchemaService: DatabaseSchemaService = new DatabaseSchemaService(
      completeDatabaseSchema,
      completeDatabaseSchemaTables,
    );

    const newInstallationDataService: NewInstallationDataService = new NewInstallationDataService();
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

    registerSystemIpc(() => mainWindow, systemService);
    registerConfigurationIpc(() => mainWindow, configurationService, installationService);

    await createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createWindow();
      }
    });
  })
  .catch((error: unknown) => {
    console.error('Error iniciando Osumi TPV Client:', error);

    app.quit();
  });

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
