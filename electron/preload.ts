import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
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
import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';
import AppInfo from '@desktop-contracts/system/app-info.interface';
import IPC_CHANNELS from '@ipc/channels';
import type { IpcRendererEvent } from 'electron';
import { contextBridge, ipcRenderer } from 'electron';

const desktopApi: OsumiDesktopApi = Object.freeze({
  isElectron: true,

  application: {
    getState: (): Promise<ApplicationStateResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.applicationGetState) as Promise<ApplicationStateResult>,
  },

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

  configuration: Object.freeze({
    install: (command: InstallationCommand): Promise<InstallationResult> =>
      ipcRenderer.invoke(IPC_CHANNELS.configurationInstall, command) as Promise<InstallationResult>,
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

  system: Object.freeze({
    getAppInfo: (): Promise<AppInfo> =>
      ipcRenderer.invoke(IPC_CHANNELS.systemGetAppInfo) as Promise<AppInfo>,
  }),
});

contextBridge.exposeInMainWorld('osumiDesktop', desktopApi);
