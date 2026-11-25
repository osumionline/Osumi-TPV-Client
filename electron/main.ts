import 'reflect-metadata';

import { app, BrowserWindow, Menu, powerMonitor, protocol } from 'electron';

import type InstallationFinalizer from '@backend/contracts/configuration/installation-finalizer.interface';
import type ApplicationLogger from '@backend/contracts/logging/application-logger.interface';
import type ApplicationPaths from '@backend/contracts/system/application-paths.interface';
import createApplicationComposition from '@bootstrap/application-composition';
import type ApplicationComposition from '@bootstrap/application-composition.interface';
import ElectronApplicationPathsProvider from '@infrastructure/electron/electron-application-paths.provider';
import { createMainWindow, getRendererAssetsDirectory } from '@infrastructure/electron/main-window';
import registerAssetsProtocol from '@infrastructure/electron/register-assets-protocol';
import ApplicationDirectoriesService from '@infrastructure/filesystem/application-directories.service';
import FileInstallationFinalizer from '@infrastructure/filesystem/file-installation-finalizer';
import FileApplicationLogger from '@infrastructure/logging/file-application.logger';

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

let applicationComposition: ApplicationComposition | null = null;
let applicationLogger: ApplicationLogger | null = null;

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

    applicationLogger = new FileApplicationLogger(
      applicationPaths.logsDirectory,
      applicationVersion,
    );

    registerAssetsProtocol(applicationPaths, getRendererAssetsDirectory(), applicationLogger);

    /*
     * Recuperación de instalaciones interrumpidas.
     */
    const installationFinalizer: InstallationFinalizer = new FileInstallationFinalizer(
      applicationPaths,
      applicationLogger,
    );

    await installationFinalizer.recover();

    /*
     * Grafo de dependencias e IPC.
     */
    applicationComposition = createApplicationComposition(
      applicationPaths,
      applicationVersion,
      installationFinalizer,
      applicationLogger,
    );

    /*
     * Ejecución manual de sincronización en desarrollo.
     *
     * Requiere indicar expresamente la URL de pruebas.
     * El arranque normal no ejecuta esta operación.
     */
    const tiendaOnlineTestUrl: string | undefined = process.env['OSUMI_TPV_SYNC_TEST_URL'];

    if (!app.isPackaged && tiendaOnlineTestUrl !== undefined) {
      try {
        const execution =
          await applicationComposition.tiendaOnlineEjecucionService.execute(tiendaOnlineTestUrl);

        if (execution.outcome === 'completed') {
          const result = execution.result;

          const acknowledged: number = result.pedidos.filter(
            (pedido): boolean => pedido.estado === 'acknowledged',
          ).length;

          applicationComposition.applicationLogger.info({
            area: 'tienda-online',
            operation: 'manual-sync',
            message: 'Finalizada la sincronización manual de tienda online.',
            context: {
              paginas: result.paginas,
              pedidos: result.pedidos.length,
              confirmados: acknowledged,
              pendientes: result.pedidos.length - acknowledged,
              limiteAlcanzado: result.limiteAlcanzado,
            },
          });
        } else {
          applicationComposition.applicationLogger.info({
            area: 'tienda-online',
            operation: 'manual-sync',
            message: 'No se ha iniciado la sincronización manual.',
            context: {
              outcome: execution.outcome,
            },
          });
        }
      } catch {
        applicationComposition.applicationLogger.error({
          area: 'tienda-online',
          operation: 'manual-sync',
          message: 'No se ha podido completar la sincronización manual de pruebas.',
        });
      }
    }

    /*
     * Ventana principal.
     */
    await createMainWindow();

    /*
     * Copias remotas automáticas.
     *
     * El scheduler realiza una primera evaluación
     * asíncrona y no bloquea el arranque de la ventana.
     */
    applicationComposition.backupAutomaticSchedulerService.start();

    applicationComposition.applicationLogger.info({
      area: 'application',
      operation: 'startup',
      message: 'Osumi TPV Client se ha iniciado correctamente.',
    });

    /*
     * Al volver de una suspensión, el timer programado
     * puede haber vencido mientras el equipo dormía.
     *
     * Forzamos una reevaluación para crear inmediatamente
     * la copia pendiente si corresponde.
     */
    powerMonitor.on('resume', (): void => {
      applicationComposition?.backupAutomaticSchedulerService.reevaluate();
    });

    app.on('activate', (): void => {
      if (BrowserWindow.getAllWindows().length === 0) {
        void createMainWindow();
      }
    });
  })
  .catch(async (error: unknown): Promise<void> => {
    if (applicationLogger === null) {
      console.error('Error iniciando Osumi TPV Client:', error);

      app.quit();

      return;
    }

    applicationLogger.error({
      area: 'application',
      operation: 'startup',
      message: 'No se ha podido iniciar Osumi TPV Client.',
      error,
    });

    await applicationLogger.flush();

    app.quit();
  });

app.on('before-quit', (event): void => {
  if (applicationQuitPrepared || applicationComposition === null) {
    return;
  }

  applicationComposition.backupAutomaticSchedulerService.stop();

  event.preventDefault();

  void applicationComposition.applicationDatabase
    .disconnect()
    .catch((error: unknown): void => {
      applicationComposition?.applicationLogger.error({
        area: 'database',
        operation: 'disconnect',
        message: 'No se ha podido cerrar la base de datos de la aplicación.',
        error,
      });
    })
    .finally(async (): Promise<void> => {
      applicationComposition?.applicationLogger.info({
        area: 'application',
        operation: 'shutdown',
        message: 'Osumi TPV Client se ha cerrado correctamente.',
      });

      await applicationComposition?.applicationLogger.flush();

      applicationQuitPrepared = true;

      app.quit();
    });
});

app.on('window-all-closed', (): void => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
