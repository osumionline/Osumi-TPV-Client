import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';

export interface AppInfo {
  readonly name: string;
  readonly version: string;
  readonly platform: string;
  readonly arch: string;
  readonly electronVersion: string;
  readonly chromeVersion: string;
  readonly nodeVersion: string;
  readonly isPackaged: boolean;
}

export interface OsumiDesktopApi {
  readonly isElectron: true;

  readonly system: {
    getAppInfo(): Promise<AppInfo>;
  };

  readonly configuration: {
    isConfigured(): Promise<boolean>;

    install(command: InstallationCommand): Promise<InstallationResult>;
  };
}
