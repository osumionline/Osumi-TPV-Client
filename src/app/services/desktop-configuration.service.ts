import { Injectable } from '@angular/core';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type { InstallationResult } from '@desktop-contracts/configuration/installation-result.interface';
import type { OsumiDesktopApi } from '@desktop-contracts/desktop-api';

@Injectable({
  providedIn: 'root',
})
export default class DesktopConfigurationService {
  isConfigured(): Promise<boolean> {
    const api: OsumiDesktopApi | undefined = window.osumiDesktop;

    if (api === undefined) {
      return Promise.resolve(false);
    }

    return api.configuration.isConfigured();
  }

  install(command: InstallationCommand): Promise<InstallationResult> {
    const api: OsumiDesktopApi | undefined = window.osumiDesktop;

    if (api === undefined) {
      return Promise.reject(new Error('La API de escritorio no está disponible.'));
    }

    return api.configuration.install(command);
  }
}
