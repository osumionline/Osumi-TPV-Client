import { inject, Service, signal, type Signal, type WritableSignal } from '@angular/core';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import DesktopConfigurationService from '@services/desktop-configuration.service';

/**
 * Mantiene en memoria la configuración global de la instalación.
 */
@Service()
export default class AppDataService {
  private readonly desktopConfigurationService: DesktopConfigurationService = inject(
    DesktopConfigurationService,
  );
  private readonly appDataSignal: WritableSignal<AppData | null> = signal<AppData | null>(null);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);
  private loadPromise: Promise<AppData | null> | null = null;

  readonly appData: Signal<AppData | null> = this.appDataSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

  /**
   * Carga AppData una única vez y comparte una carga concurrente
   * entre todos los consumidores.
   */
  async load(): Promise<AppData | null> {
    if (this.loaded()) {
      return this.appData();
    }

    if (this.loadPromise !== null) {
      return this.loadPromise;
    }

    this.loadPromise = this.loadFromDesktop();

    try {
      return await this.loadPromise;
    } finally {
      this.loadPromise = null;
    }
  }

  /**
   * Obtiene AppData desde el proceso principal y actualiza la caché.
   */
  private async loadFromDesktop(): Promise<AppData | null> {
    const appData: AppData | null = await this.desktopConfigurationService.getAppData();

    this.appDataSignal.set(appData);
    this.loadedSignal.set(true);

    return appData;
  }
}
