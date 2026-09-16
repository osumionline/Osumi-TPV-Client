import { Component, computed, inject, type OnInit, type Signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import HeaderComponent from '@app/components/header/header.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/application/app-data.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Shell común de las páginas del apartado de Gestión.
 */
@Component({
  selector: 'otpv-management-shell',
  templateUrl: './management-shell.component.html',
  styleUrl: './management-shell.component.scss',
  imports: [HeaderComponent, RouterOutlet],
})
export default class ManagementShellComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);

  readonly appDataService: AppDataService = inject(AppDataService);

  readonly appName: Signal<string> = computed((): string => {
    const appData = this.appDataService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  /**
   * Precarga la configuración general necesaria para la cabecera.
   */
  ngOnInit(): void {
    void this.loadAppData();
  }

  /**
   * Carga la configuración global de la instalación.
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
