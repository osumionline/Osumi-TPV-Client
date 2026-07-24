import { app, BrowserWindow } from 'electron';
import { join } from 'node:path';
import { registerSystemIpc } from './ipc/register-system-ipc';

const DEV_SERVER_URL = process.env['OSUMI_TPV_RENDERER_URL'];

let mainWindow: BrowserWindow | null = null;

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
    registerSystemIpc(() => mainWindow);

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
