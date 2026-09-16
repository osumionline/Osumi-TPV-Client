import { Component, DestroyRef, inject, signal, type WritableSignal } from '@angular/core';
import type ComercialFormModel from '@model/proveedores/comercial-form.model';
import Comercial from '@model/proveedores/comercial.model';
import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';
import type ProveedorWorkspaceSection from '@model/proveedores/proveedor-workspace-section.type';
import ProveedorComercialesComponent from '@modules/compras/proveedores/components/proveedor-comerciales/proveedor-comerciales.component';
import ProveedorFormComponent from '@modules/compras/proveedores/components/proveedor-form/proveedor-form.component';
import ProveedorMarcasComponent from '@modules/compras/proveedores/components/proveedor-marcas/proveedor-marcas.component';
import ProveedorSectionTabsComponent from '@modules/compras/proveedores/components/proveedor-section-tabs/proveedor-section-tabs.component';
import { DialogService } from '@osumi/angular-tools';
import MarcasService from '@services/compras/marcas.service';
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
  imports: [
    ProveedorComercialesComponent,
    ProveedorFormComponent,
    ProveedorMarcasComponent,
    ProveedorSectionTabsComponent,
  ],
})
export default class ProveedoresComponent {
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);
  readonly marcasService: MarcasService = inject(MarcasService);
  private readonly dialog: DialogService = inject(DialogService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private saveFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  private commercialSaveFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;

  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);
  readonly commercialSaveSuccessful: WritableSignal<boolean> = signal<boolean>(false);

  constructor() {
    this.destroyRef.onDestroy((): void => {
      this.clearSaveFeedbackTimeout();
      this.clearCommercialSaveFeedbackTimeout();
    });
  }

  /**
   * Actualiza únicamente la selección de Marcas
   * dentro del draft principal compartido.
   */
  updateMarcas(idsMarcas: readonly number[]): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    const workspace = this.proveedoresService.workspace();

    if (workspace === null) {
      return;
    }

    this.hideSaveFeedback();

    this.proveedoresService.actualizarDraft({
      ...workspace.draft,
      marcas: [...idsMarcas],
    });
  }

  /**
   * Guarda desde la pestaña Marcas el mismo
   * draft principal utilizado por Datos.
   */
  async saveMarcas(): Promise<void> {
    if (this.proveedoresService.processing() || !this.proveedoresService.dirty()) {
      return;
    }

    this.hideSaveFeedback();

    try {
      await this.proveedoresService.saveWorkspace();

      this.showSaveFeedback();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se han podido guardar las marcas del proveedor.'),
        })
        .subscribe();
    }
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

  /**
   * Abre un Comercial persistido, solicitando
   * confirmación si se perdería otro draft dirty.
   */
  selectComercial(comercial: Comercial): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    const current = this.proveedoresService.workspace()?.comercialWorkspace ?? null;

    if (current?.state === 'existing' && current.comercialId === comercial.id) {
      return;
    }

    this.hideCommercialSaveFeedback();

    this.runAfterComercialDiscardConfirmation((): void => {
      this.proveedoresService.abrirComercial(comercial);
    });
  }

  /**
   * Inicia un Comercial nuevo, confirmando antes
   * el descarte del Comercial dirty actual.
   */
  newComercial(): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.hideCommercialSaveFeedback();

    this.runAfterComercialDiscardConfirmation((): void => {
      this.proveedoresService.crearBorradorComercial();
    });
  }

  /**
   * Sincroniza el formulario de Comercial
   * con su workspace independiente.
   */
  updateComercialDraft(model: ComercialFormModel): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.hideCommercialSaveFeedback();

    this.proveedoresService.actualizarComercialDraft(model);
  }

  /**
   * Persiste el Comercial actual sin guardar
   * ni modificar el draft principal del Proveedor.
   */
  async saveComercial(model: ComercialFormModel): Promise<void> {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.hideCommercialSaveFeedback();

    this.proveedoresService.actualizarComercialDraft(model);

    try {
      await this.proveedoresService.saveComercialWorkspace();

      this.showCommercialSaveFeedback();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido guardar el comercial.'),
        })
        .subscribe();
    }
  }

  /**
   * Cancela únicamente el Comercial activo.
   *
   * Un Comercial nuevo se cierra; uno existente
   * vuelve a su propia instantánea base.
   */
  cancelComercial(): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    const comercialWorkspace = this.proveedoresService.workspace()?.comercialWorkspace ?? null;

    if (comercialWorkspace === null) {
      return;
    }

    this.hideCommercialSaveFeedback();

    if (comercialWorkspace.state === 'new') {
      this.proveedoresService.cerrarComercial();

      return;
    }

    this.proveedoresService.cancelarCambiosComercial();
  }

  /**
   * Solicita confirmación antes de dar
   * de baja el Comercial seleccionado.
   */
  deleteComercial(): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    const comercialWorkspace = this.proveedoresService.workspace()?.comercialWorkspace ?? null;

    if (comercialWorkspace === null || comercialWorkspace.state !== 'existing') {
      return;
    }

    const nombre: string =
      comercialWorkspace.baseSnapshot.nombre || comercialWorkspace.draft.nombre;

    const dirtyMessage: string = this.proveedoresService.comercialDirty()
      ? ' Los cambios sin guardar también se perderán.'
      : '';

    this.dialog
      .confirm({
        title: 'Eliminar comercial',
        content: `¿Quieres eliminar el comercial "${nombre}"?${dirtyMessage}`,
      })
      .subscribe((result: boolean): void => {
        if (result) {
          void this.confirmDeleteComercial();
        }
      });
  }

  /**
   * Ejecuta una sustitución del Comercial actual
   * directamente o después de confirmar su descarte.
   */
  private runAfterComercialDiscardConfirmation(action: () => void): void {
    if (!this.proveedoresService.comercialDirty()) {
      action();

      return;
    }

    this.dialog
      .confirm({
        title: 'Descartar cambios',
        content:
          'El comercial actual contiene cambios sin guardar. ' +
          '¿Quieres descartarlos y continuar?',
      })
      .subscribe((result: boolean): void => {
        if (result) {
          action();
        }
      });
  }

  /**
   * Ejecuta la baja confirmada del Comercial.
   */
  private async confirmDeleteComercial(): Promise<void> {
    this.hideCommercialSaveFeedback();

    try {
      await this.proveedoresService.deactivateComercialWorkspace();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido eliminar el comercial.'),
        })
        .subscribe();
    }
  }

  /**
   * Muestra temporalmente el feedback
   * del guardado independiente de Comercial.
   */
  private showCommercialSaveFeedback(): void {
    this.clearCommercialSaveFeedbackTimeout();

    this.commercialSaveSuccessful.set(true);

    this.commercialSaveFeedbackTimeout = setTimeout((): void => {
      this.commercialSaveSuccessful.set(false);
      this.commercialSaveFeedbackTimeout = null;
    }, 3000);
  }

  /**
   * Oculta cualquier feedback previo
   * del guardado de Comercial.
   */
  private hideCommercialSaveFeedback(): void {
    this.clearCommercialSaveFeedbackTimeout();

    this.commercialSaveSuccessful.set(false);
  }

  /**
   * Cancela el timeout pendiente del
   * feedback de Comercial.
   */
  private clearCommercialSaveFeedbackTimeout(): void {
    if (this.commercialSaveFeedbackTimeout === null) {
      return;
    }

    clearTimeout(this.commercialSaveFeedbackTimeout);

    this.commercialSaveFeedbackTimeout = null;
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
