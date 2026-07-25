import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export default class DesktopConfigurationService {
  isConfigured(): Promise<boolean> {
    if (!window.osumiDesktop) {
      return Promise.resolve(false);
    }

    return window.osumiDesktop.configuration.isConfigured();
  }
}
