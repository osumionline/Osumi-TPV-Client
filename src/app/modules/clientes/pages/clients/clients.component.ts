import { Component, computed, inject, type OnInit, type Signal } from '@angular/core';
import HeaderComponent from '@app/components/header/header.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Página principal del módulo de Clientes.
 */
@Component({
  selector: 'otpv-clients',
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
  imports: [HeaderComponent],
})
export default class ClientsComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);
  readonly appName: Signal<string> = computed((): string => {
    const appData = this.appDataService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  /**
   * Precarga la configuración general utilizada por el módulo.
   */
  ngOnInit(): void {
    void this.loadAppData();
  }

  /**
   * Recupera AppData para mostrar la identidad de la instalación.
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
