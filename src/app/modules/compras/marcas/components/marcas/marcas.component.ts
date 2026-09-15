import { Component, DestroyRef, inject, signal, type WritableSignal } from '@angular/core';
import type MarcaFormModel from '@model/marcas/marca-form.model';
import type MarcaWorkspaceSection from '@model/marcas/marca-workspace-section.type';
import MarcaFormComponent from '@modules/compras/marcas/components/marca-form/marca-form.component';
import MarcaSectionTabsComponent from '@modules/compras/marcas/components/marca-section-tabs/marca-section-tabs.component';
import { DialogService } from '@osumi/angular-tools';
import MarcasService from '@services/compras/marcas.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Muestra el workspace principal de gestión de Marcas.
 */
@Component({
  selector: 'otpv-marcas',
  templateUrl: './marcas.component.html',
  styleUrl: './marcas.component.scss',
  imports: [MarcaFormComponent, MarcaSectionTabsComponent],
})
export default class MarcasComponent {
  readonly marcasService: MarcasService = inject(MarcasService);
  private readonly dialog: DialogService = inject(DialogService);
  private readonly destroyRef: DestroyRef = inject(DestroyRef);

  private saveFeedbackTimeout: ReturnType<typeof setTimeout> | null = null;
  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Garantiza que no quede pendiente el temporizador
   * del feedback al destruir la pantalla.
   */
  constructor() {
    this.destroyRef.onDestroy((): void => {
      this.clearSaveFeedbackTimeout();
    });
  }

  /**
   * Cambia la sección activa de la ficha de Marca.
   */
  selectSection(section: MarcaWorkspaceSection): void {
    this.hideSaveFeedback();

    this.marcasService.seleccionarSeccion(section);
  }

  /**
   * Sincroniza el formulario editable con el
   * draft conservado en el workspace.
   */
  updateDraft(model: MarcaFormModel): void {
    this.hideSaveFeedback();

    this.marcasService.actualizarDraft(model);
  }

  /**
   * Restaura todos los datos editables a la
   * instantánea base de la ficha.
   */
  cancelChanges(): void {
    if (this.marcasService.saving()) {
      return;
    }

    this.hideSaveFeedback();

    this.marcasService.cancelarCambios();
  }

  /**
   * Persiste el formulario validado y muestra
   * feedback temporal cuando finaliza correctamente.
   */
  async saveMarca(model: MarcaFormModel): Promise<void> {
    if (this.marcasService.saving()) {
      return;
    }

    this.hideSaveFeedback();

    this.marcasService.actualizarDraft(model);

    try {
      await this.marcasService.saveWorkspace();

      this.showSaveFeedback();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido guardar la marca.'),
        })
        .subscribe();
    }
  }

  /**
   * Muestra temporalmente la confirmación
   * de guardado correcto.
   */
  private showSaveFeedback(): void {
    this.clearSaveFeedbackTimeout();

    this.saveSuccessful.set(true);

    this.saveFeedbackTimeout = setTimeout((): void => {
      this.saveSuccessful.set(false);
      this.saveFeedbackTimeout = null;
    }, 3000);
  }

  /**
   * Oculta cualquier confirmación de guardado
   * que todavía permanezca visible.
   */
  private hideSaveFeedback(): void {
    this.clearSaveFeedbackTimeout();

    this.saveSuccessful.set(false);
  }

  /**
   * Cancela el temporizador pendiente del
   * mensaje temporal de guardado.
   */
  private clearSaveFeedbackTimeout(): void {
    if (this.saveFeedbackTimeout === null) {
      return;
    }

    clearTimeout(this.saveFeedbackTimeout);

    this.saveFeedbackTimeout = null;
  }
}
