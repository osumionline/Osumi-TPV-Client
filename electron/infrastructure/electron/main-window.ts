import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';

const DEV_SERVER_URL: string | undefined = process.env['OSUMI_TPV_RENDERER_URL'];

let mainWindow: BrowserWindow | null = null;

/**
 * Devuelve la ventana principal actual de la aplicación.
 */
export function getMainWindow(): BrowserWindow | null {
  return mainWindow;
}

/**
 * Crea, configura y carga la ventana principal.
 */
export async function createMainWindow(): Promise<void> {
  const browserWindow: BrowserWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 700,
    show: false,
    webPreferences: {
      preload: join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  mainWindow = browserWindow;

  browserWindow.once('ready-to-show', (): void => {
    browserWindow.maximize();
    browserWindow.show();
  });

  browserWindow.once('closed', (): void => {
    if (mainWindow === browserWindow) {
      mainWindow = null;
    }
  });

  if (!app.isPackaged) {
    browserWindow.webContents.on('before-input-event', (event, input): void => {
      if (input.type !== 'keyDown') {
        return;
      }

      const toggleWithShortcut: boolean =
        input.control && input.shift && input.key.toLowerCase() === 'i';

      const toggleWithF12: boolean = input.key === 'F12';

      if (!toggleWithShortcut && !toggleWithF12) {
        return;
      }

      event.preventDefault();

      browserWindow.webContents.toggleDevTools();
    });
  }

  if (DEV_SERVER_URL !== undefined && DEV_SERVER_URL.length > 0) {
    await browserWindow.loadURL(DEV_SERVER_URL);

    return;
  }

  await browserWindow.loadFile(
    join(__dirname, '..', 'dist', 'osumi-tpv-client', 'browser', 'index.html'),
  );
}
