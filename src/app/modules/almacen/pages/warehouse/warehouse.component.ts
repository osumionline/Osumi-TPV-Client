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
import type AlmacenSection from '@model/almacen/almacen-section.type';
import CaducidadesComponent from '@modules/almacen/components/caducidades/caducidades.component';
import ImprentaComponent from '@modules/almacen/components/imprenta/imprenta.component';
import InventoryComponent from '@modules/almacen/components/inventory/inventory.component';
import WarehouseTabsComponent from '@modules/almacen/components/warehouse-tabs/warehouse-tabs.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Página principal del módulo de Almacén.
 */
@Component({
  selector: 'otpv-warehouse',
  templateUrl: './warehouse.component.html',
  styleUrl: './warehouse.component.scss',
  imports: [
    HeaderComponent,
    WarehouseTabsComponent,
    InventoryComponent,
    CaducidadesComponent,
    ImprentaComponent,
  ],
})
export default class WarehouseComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);

  readonly activeSection: WritableSignal<AlmacenSection> = signal<AlmacenSection>('inventory');

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
  selectSection(section: AlmacenSection): void {
    this.activeSection.set(section);
  }

  /**
   * Precarga AppData para los consumidores del módulo de Almacén.
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
