import {
  Component,
  computed,
  inject,
  signal,
  viewChild,
  type OnDestroy,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import HeaderComponent from '@app/components/header/header.component';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import type ClienteWorkspaceSection from '@model/clientes/cliente-workspace-section.type';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';
import type Cliente from '@model/clientes/cliente.model';
import ClientFormComponent from '@modules/clientes/components/client-form/client-form.component';
import ClientSearchComponent from '@modules/clientes/components/client-search/client-search.component';
import ClientSectionTabsComponent from '@modules/clientes/components/client-section-tabs/client-section-tabs.component';
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
  imports: [
    ClientFormComponent,
    ClientSearchComponent,
    ClientSectionTabsComponent,
    HeaderComponent,
    MatButton,
    MatIconButton,
    MatIcon,
    MatTooltip,
  ],
})
export default class ClientsComponent implements OnInit, OnDestroy {
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);
  readonly clientesService: ClientesService = inject(ClientesService);

  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly saving: WritableSignal<boolean> = signal<boolean>(false);
  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);
  readonly focusNameRequest: WritableSignal<number> = signal<number>(0);
  readonly clientFormSection: Signal<'data' | 'billing'> = computed((): 'data' | 'billing' =>
    this.clientesService.workspace()?.activeSection === 'billing' ? 'billing' : 'data',
  );
  readonly appName: Signal<string> = computed((): string => {
    const appData = this.appDataService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  private readonly clientForm: Signal<ClientFormComponent | undefined> =
    viewChild<ClientFormComponent>(ClientFormComponent);

  private saveFeedbackTimeoutId: number | null = null;

  /**
   * Precarga la configuración general utilizada por el módulo.
   */
  ngOnInit(): void {
    void this.loadAppData();
  }

  /**
   * Cancela el temporizador del aviso de guardado al abandonar la página.
   */
  ngOnDestroy(): void {
    this.clearSaveFeedback();
  }

  /**
   * Muestra el buscador de clientes cargados en memoria.
   */
  openSearch(): void {
    if (this.saving()) {
      return;
    }

    this.searchOpen.set(true);
  }

  /**
   * Cierra el buscador sin modificar la ficha activa.
   */
  closeSearch(): void {
    this.searchOpen.set(false);
  }

  /**
   * Cambia el apartado activo de la ficha abierta.
   */
  selectSection(section: ClienteWorkspaceSection): void {
    if (this.saving()) {
      return;
    }

    this.clientesService.seleccionarSeccion(section);
  }

  /**
   * Incorpora al workspace los cambios realizados en el formulario.
   */
  updateDraft(model: ClienteFormModel): void {
    if (this.saving()) {
      return;
    }

    this.clearSaveFeedback();
    this.clientesService.actualizarDraft(model);
  }

  /**
   * Valida globalmente y persiste la ficha de cliente abierta.
   */
  async saveCliente(): Promise<void> {
    const workspace: ClienteWorkspace | null = this.clientesService.workspace();

    if (this.saving() || workspace === null || !workspace.dirty) {
      return;
    }

    const clientForm: ClientFormComponent | undefined = this.clientForm();

    if (clientForm === undefined) {
      return;
    }

    const invalidSection: ClienteWorkspaceSection | null = clientForm.validate();

    if (invalidSection !== null) {
      this.clientesService.seleccionarSeccion(invalidSection);

      return;
    }

    this.clearSaveFeedback();
    this.saving.set(true);

    try {
      await this.clientesService.guardar();
      this.showSaveFeedback();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido guardar el cliente.'),
        })
        .subscribe();
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Solicita confirmación antes de restaurar la instantánea base.
   */
  cancelClienteChanges(): void {
    const workspace: ClienteWorkspace | null = this.clientesService.workspace();

    if (this.saving() || workspace === null || !workspace.dirty) {
      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content: '¿Quieres descartar todos los cambios realizados en esta ficha?',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        this.clientesService.cancelarCambios();
      });
  }

  /**
   * Abre el cliente seleccionado protegiendo los cambios
   * pendientes de la ficha actualmente activa.
   */
  selectCliente(cliente: Cliente): void {
    if (this.saving()) {
      return;
    }
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
    if (this.saving()) {
      return;
    }

    this.clearSaveFeedback();
    const workspace: ClienteWorkspace | null = this.clientesService.workspace();

    if (workspace === null || !workspace.dirty) {
      this.createClienteDraft();
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
          this.createClienteDraft();
        }
      });
  }

  /**
   * Cierra la ficha abierta solicitando confirmación
   * cuando contiene cambios pendientes.
   */
  closeCliente(): void {
    if (this.saving()) {
      return;
    }

    this.clearSaveFeedback();
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
   * Muestra temporalmente la confirmación de guardado.
   */
  private showSaveFeedback(): void {
    this.clearSaveFeedback();
    this.saveSuccessful.set(true);

    this.saveFeedbackTimeoutId = window.setTimeout((): void => {
      this.saveSuccessful.set(false);
      this.saveFeedbackTimeoutId = null;
    }, 4_000);
  }

  /**
   * Oculta la confirmación de guardado activa.
   */
  private clearSaveFeedback(): void {
    if (this.saveFeedbackTimeoutId !== null) {
      window.clearTimeout(this.saveFeedbackTimeoutId);
      this.saveFeedbackTimeoutId = null;
    }

    this.saveSuccessful.set(false);
  }

  /**
   * Sustituye el workspace actual por la ficha del cliente indicado
   * y cierra el buscador.
   */
  private openCliente(cliente: Cliente): void {
    this.clearSaveFeedback();
    this.clientesService.abrirFicha(cliente);
    this.searchOpen.set(false);
  }

  /**
   * Abre un borrador nuevo y solicita el foco para su campo de nombre.
   */
  private createClienteDraft(): void {
    this.clientesService.crearBorrador();
    this.focusNameRequest.update((request: number): number => request + 1);
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
