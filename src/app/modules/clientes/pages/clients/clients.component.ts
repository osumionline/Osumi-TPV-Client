import { Component, computed, inject, type OnInit, type Signal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import HeaderComponent from '@app/components/header/header.component';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import ClientesService from '@services/clientes.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Página principal del módulo de Clientes.
 */
@Component({
  selector: 'otpv-clients',
  templateUrl: './clients.component.html',
  styleUrl: './clients.component.scss',
  imports: [HeaderComponent, MatIconButton, MatIcon, MatTooltip],
})
export default class ClientsComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);
  readonly clientesService: ClientesService = inject(ClientesService);
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
   * Abre una nueva ficha vacía.
   */
  newCliente(): void {
    const workspace: ClienteWorkspace | null = this.clientesService.workspace();

    if (workspace === null || !workspace.dirty) {
      this.clientesService.crearBorrador();

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          'La ficha contiene cambios sin guardar. ' +
          '¿Quieres descartarlos y crear un cliente nuevo?',
      })
      .subscribe((result: boolean): void => {
        if (result) {
          this.clientesService.crearBorrador();
        }
      });
  }

  /**
   * Cierra la ficha abierta solicitando confirmación
   * cuando contiene cambios pendientes.
   */
  closeCliente(): void {
    const workspace: ClienteWorkspace | null = this.clientesService.workspace();

    if (workspace === null) {
      return;
    }

    if (!workspace.dirty) {
      this.clientesService.cerrarFicha();

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          'La ficha contiene cambios sin guardar. ' + '¿Quieres cerrarla y perder esos cambios?',
      })
      .subscribe((result: boolean): void => {
        if (result) {
          this.clientesService.cerrarFicha();
        }
      });
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
