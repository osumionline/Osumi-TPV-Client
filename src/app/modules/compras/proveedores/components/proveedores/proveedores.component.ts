import { Component, DestroyRef, inject, signal, type WritableSignal } from '@angular/core';
import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';
import type ProveedorWorkspaceSection from '@model/proveedores/proveedor-workspace-section.type';
import ProveedorFormComponent from '@modules/compras/proveedores/components/proveedor-form/proveedor-form.component';
import ProveedorSectionTabsComponent from '@modules/compras/proveedores/components/proveedor-section-tabs/proveedor-section-tabs.component';
import { DialogService } from '@osumi/angular-tools';
import ProveedoresService from '@services/compras/proveedores.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Muestra el workspace principal
 * de gestión de Proveedores.
 */
@Component({
  selector: 'otpv-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
  imports: [ProveedorFormComponent, ProveedorSectionTabsComponent],
})
export default class ProveedoresComponent {
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);

  private readonly dialog: DialogService = inject(DialogService);

  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private saveFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);

  constructor() {
    this.destroyRef.onDestroy((): void => {
      this.clearSaveFeedbackTimeout();
    });
  }

  /**
   * Cambia la sección activa.
   */
  selectSection(section: ProveedorWorkspaceSection): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.hideSaveFeedback();

    this.proveedoresService.seleccionarSeccion(section);
  }

  /**
   * Sincroniza el formulario con
   * el draft conservado.
   */
  updateDraft(model: ProveedorFormModel): void {
    this.hideSaveFeedback();

    this.proveedoresService.actualizarDraft(model);
  }

  /**
   * Restaura los datos principales y
   * descarta cualquier staging.
   */
  async cancelChanges(): Promise<void> {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.hideSaveFeedback();

    try {
      await this.proveedoresService.cancelarCambios();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido descartar el logo temporal.'),
        })
        .subscribe();
    }
  }

  /**
   * Persiste el Proveedor actual.
   */
  async saveProveedor(model: ProveedorFormModel): Promise<void> {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.hideSaveFeedback();

    this.proveedoresService.actualizarDraft(model);

    try {
      await this.proveedoresService.saveWorkspace();

      this.showSaveFeedback();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido guardar el proveedor.'),
        })
        .subscribe();
    }
  }

  /**
   * Prepara un logo seleccionado.
   */
  async selectLogo(file: File): Promise<void> {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.hideSaveFeedback();

    try {
      await this.proveedoresService.seleccionarLogo(file);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido preparar el logo seleccionado.'),
        })
        .subscribe();
    }
  }

  /**
   * Quita el logo del draft.
   */
  async removeLogo(): Promise<void> {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.hideSaveFeedback();

    try {
      await this.proveedoresService.quitarLogo();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido quitar el logo.'),
        })
        .subscribe();
    }
  }

  /**
   * Solicita confirmación antes de dar
   * de baja el Proveedor abierto.
   */
  deleteProveedor(): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    const workspace = this.proveedoresService.workspace();

    if (workspace === null || workspace.proveedorId === null) {
      return;
    }

    const nombre: string = workspace.baseSnapshot.nombre || workspace.draft.nombre;

    const dirtyMessage: string = this.proveedoresService.hasUnsavedChanges()
      ? ' Los cambios sin guardar también se perderán.'
      : '';

    this.dialog
      .confirm({
        title: 'Eliminar proveedor',
        content: `¿Quieres eliminar el proveedor "${nombre}"?` + dirtyMessage,
      })
      .subscribe((result: boolean): void => {
        if (result) {
          void this.confirmDeleteProveedor();
        }
      });
  }

  private async confirmDeleteProveedor(): Promise<void> {
    this.hideSaveFeedback();

    try {
      await this.proveedoresService.deactivateWorkspace();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido eliminar el proveedor.'),
        })
        .subscribe();
    }
  }

  private showSaveFeedback(): void {
    this.clearSaveFeedbackTimeout();

    this.saveSuccessful.set(true);

    this.saveFeedbackTimeout = setTimeout((): void => {
      this.saveSuccessful.set(false);
      this.saveFeedbackTimeout = null;
    }, 3000);
  }

  private hideSaveFeedback(): void {
    this.clearSaveFeedbackTimeout();

    this.saveSuccessful.set(false);
  }

  private clearSaveFeedbackTimeout(): void {
    if (this.saveFeedbackTimeout === null) {
      return;
    }

    clearTimeout(this.saveFeedbackTimeout);

    this.saveFeedbackTimeout = null;
  }
}
