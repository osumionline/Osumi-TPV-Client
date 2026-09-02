import {
  Component,
  computed,
  inject,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import HeaderComponent from '@app/components/header/header.component';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';
import type Cliente from '@model/clientes/cliente.model';
import ClientSearchComponent from '@modules/clientes/components/client-search/client-search.component';
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
  imports: [ClientSearchComponent, HeaderComponent, MatIconButton, MatIcon, MatTooltip],
})
export default class ClientsComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);
  readonly clientesService: ClientesService = inject(ClientesService);

  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);
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
   * Muestra el buscador de clientes cargados en memoria.
   */
  openSearch(): void {
    this.searchOpen.set(true);
  }

  /**
   * Cierra el buscador sin modificar la ficha activa.
   */
  closeSearch(): void {
    this.searchOpen.set(false);
  }

  /**
   * Abre el cliente seleccionado protegiendo los cambios
   * pendientes de la ficha actualmente activa.
   */
  selectCliente(cliente: Cliente): void {
    const workspace: ClienteWorkspace | null = this.clientesService.workspace();

    if (workspace?.clientePublicId === cliente.publicId) {
      this.searchOpen.set(false);

      return;
    }

    if (workspace === null || !workspace.dirty) {
      this.openCliente(cliente);

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          'La ficha actual contiene cambios sin guardar. ' +
          `¿Quieres descartarlos y abrir el cliente "${cliente.nombreApellidos}"?`,
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        this.openCliente(cliente);
      });
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
   * Sustituye el workspace actual por la ficha del cliente indicado
   * y cierra el buscador.
   */
  private openCliente(cliente: Cliente): void {
    this.clientesService.abrirFicha(cliente);
    this.searchOpen.set(false);
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
