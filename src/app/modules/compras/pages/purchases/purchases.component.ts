import {
  Component,
  computed,
  inject,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import HeaderComponent from '@app/components/header/header.component';
import type ComprasSection from '@model/compras/compras-section.type';
import PurchasesTabsComponent from '@modules/compras/components/purchases-tabs/purchases-tabs.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Página principal del módulo de Compras.
 */
@Component({
  selector: 'otpv-purchases',
  templateUrl: './purchases.component.html',
  styleUrl: './purchases.component.scss',
  imports: [HeaderComponent, PurchasesTabsComponent],
})
export default class PurchasesComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);
  readonly activeSection: WritableSignal<ComprasSection> = signal<ComprasSection>('orders');

  readonly appName: Signal<string> = computed((): string => {
    const appData = this.appDataService.appData();
    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  /**
   * Carga la configuración general utilizada por el módulo.
   */
  ngOnInit(): void {
    void this.loadAppData();
  }

  /**
   * Cambia la sección activa del módulo.
   */
  selectSection(section: ComprasSection): void {
    this.activeSection.set(section);
  }

  /**
   * Precarga AppData para los consumidores del módulo de Compras.
   */
  private async loadAppData(): Promise<void> {
    try {
      await this.appDataService.load();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(
            error,
            'No se ha podido cargar la configuración de la aplicación.',
          ),
        })
        .subscribe();
    }
  }
}
