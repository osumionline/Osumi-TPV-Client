import 'reflect-metadata';

import { app, BrowserWindow, Menu, protocol } from 'electron';

import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import ElectronApplicationPathsProvider from '@infrastructure/electron/electron-application-paths.provider';
import { createMainWindow } from '@infrastructure/electron/main-window';
import registerAssetsProtocol from '@infrastructure/electron/register-assets-protocol';
import ApplicationDirectoriesService from '@infrastructure/filesystem/application-directories.service';
import FileInstallationFinalizer from '@infrastructure/filesystem/file-installation-finalizer';

import createApplicationComposition from './bootstrap/application-composition';

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

let applicationDatabase: TypeOrmApplicationDatabase | null = null;

let applicationQuitPrepared: boolean = false;

app.enableSandbox();

app
  .whenReady()
  .then(async (): Promise<void> => {
    Menu.setApplicationMenu(null);

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
     * Grafo de dependencias e IPC.
     */
    applicationDatabase = createApplicationComposition(
      applicationPaths,
      applicationVersion,
      installationFinalizer,
    );

    /*
     * Ventana principal.
     */
    await createMainWindow();

    app.on('activate', (): void => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow();
      }
    });
  })
  .catch((error: unknown): void => {
    console.error('Error iniciando Osumi TPV Client:', error);

    app.quit();
  });

app.on('before-quit', (event): void => {
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
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
