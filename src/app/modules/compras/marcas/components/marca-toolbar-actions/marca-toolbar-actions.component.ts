import { Component, inject, signal, type WritableSignal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type Marca from '@model/marcas/marca.model';
import MarcaSearchComponent from '@modules/compras/marcas/components/marca-search/marca-search.component';
import { DialogService } from '@osumi/angular-tools';
import MarcasService from '@services/compras/marcas.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Muestra las acciones contextuales disponibles
 * para la sección de Marcas de Compras.
 */
@Component({
  selector: 'otpv-marca-toolbar-actions',
  templateUrl: './marca-toolbar-actions.component.html',
  styleUrl: './marca-toolbar-actions.component.scss',
  imports: [MarcaSearchComponent, MatIcon, MatIconButton, MatTooltip],
})
export default class MarcaToolbarActionsComponent {
  readonly marcasService: MarcasService = inject(MarcasService);
  private readonly dialog: DialogService = inject(DialogService);

  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Muestra el buscador de Marcas cargadas en memoria.
   */
  openSearch(): void {
    if (this.marcasService.processing()) {
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
   * Abre la Marca seleccionada protegiendo cualquier
   * draft con modificaciones pendientes.
   */
  selectMarca(marca: Marca): void {
    if (this.marcasService.processing()) {
      return;
    }

    const workspace = this.marcasService.workspace();

    if (workspace?.marcaPublicId === marca.publicId) {
      this.closeSearch();

      return;
    }

    if (workspace === null || !this.marcasService.dirty()) {
      void this.openMarca(marca);

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          'La ficha actual contiene cambios sin guardar. ' +
          `¿Quieres descartarlos y abrir la marca "${marca.nombre}"?`,
      })
      .subscribe((result: boolean): void => {
        if (result) {
          void this.openMarca(marca);
        }
      });
  }

  /**
   * Abre una ficha temporal para crear una Marca nueva,
   * solicitando confirmación si existe un draft dirty.
   */
  newMarca(): void {
    if (this.marcasService.processing()) {
      return;
    }

    const workspace = this.marcasService.workspace();

    if (workspace === null || !this.marcasService.dirty()) {
      void this.createMarcaDraft();

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          'La ficha contiene cambios sin guardar. ' +
          '¿Quieres descartarlos y crear una marca nueva?',
      })
      .subscribe((result: boolean): void => {
        if (result) {
          void this.createMarcaDraft();
        }
      });
  }

  /**
   * Cierra la ficha abierta solicitando confirmación
   * cuando contiene cambios pendientes.
   */
  closeMarca(): void {
    if (this.marcasService.processing()) {
      return;
    }

    const workspace = this.marcasService.workspace();

    if (workspace === null) {
      return;
    }

    if (!this.marcasService.dirty()) {
      void this.closeCurrentMarca();

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
          void this.closeCurrentMarca();
        }
      });
  }

  /**
   * Descarta de forma segura la ficha actual,
   * abre la Marca indicada y cierra el buscador.
   */
  private async openMarca(marca: Marca): Promise<void> {
    try {
      await this.marcasService.cerrarFicha();

      this.marcasService.abrirFicha(marca);

      this.closeSearch();
    } catch (error: unknown) {
      this.showWorkspaceError(error);
    }
  }

  /**
   * Descarta de forma segura la ficha actual y
   * abre un nuevo borrador vacío de Marca.
   */
  private async createMarcaDraft(): Promise<void> {
    try {
      await this.marcasService.cerrarFicha();

      this.marcasService.crearBorrador();

      this.closeSearch();
    } catch (error: unknown) {
      this.showWorkspaceError(error);
    }
  }

  /**
   * Cierra de forma segura la ficha actualmente abierta.
   */
  private async closeCurrentMarca(): Promise<void> {
    try {
      await this.marcasService.cerrarFicha();
    } catch (error: unknown) {
      this.showWorkspaceError(error);
    }
  }

  /**
   * Muestra un error producido mientras se descarta
   * el workspace actual de Marca.
   */
  private showWorkspaceError(error: unknown): void {
    this.dialog
      .alert({
        title: 'Error',
        content: getErrorMessage(error, 'No se ha podido descartar la ficha actual.'),
      })
      .subscribe();
  }
}
