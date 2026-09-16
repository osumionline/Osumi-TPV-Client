import { Component, inject, signal, type WritableSignal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type Proveedor from '@model/proveedores/proveedor.model';
import ProveedorSearchComponent from '@modules/compras/proveedores/components/proveedor-search/proveedor-search.component';
import { DialogService } from '@osumi/angular-tools';
import ProveedoresService from '@services/compras/proveedores.service';
import { getErrorMessage } from '@utils/error.utils';

@Component({
  selector: 'otpv-proveedor-toolbar-actions',
  templateUrl: './proveedor-toolbar-actions.component.html',
  styleUrl: './proveedor-toolbar-actions.component.scss',
  imports: [MatIcon, MatIconButton, MatTooltip, ProveedorSearchComponent],
})
export default class ProveedorToolbarActionsComponent {
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);
  private readonly dialog: DialogService = inject(DialogService);

  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);

  openSearch(): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    this.searchOpen.set(true);
  }

  closeSearch(): void {
    this.searchOpen.set(false);
  }

  selectProveedor(proveedor: Proveedor): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    const workspace = this.proveedoresService.workspace();

    if (workspace?.proveedorPublicId === proveedor.publicId) {
      this.closeSearch();

      return;
    }

    if (workspace === null || !this.proveedoresService.hasUnsavedChanges()) {
      void this.openProveedor(proveedor);

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          'La ficha actual contiene cambios sin guardar. ' +
          `¿Quieres descartarlos y abrir el proveedor "${proveedor.nombre}"?`,
      })
      .subscribe((result: boolean): void => {
        if (result) {
          void this.openProveedor(proveedor);
        }
      });
  }

  newProveedor(): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    if (!this.proveedoresService.hasUnsavedChanges()) {
      void this.createProveedorDraft();

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          'La ficha contiene cambios sin guardar. ' +
          '¿Quieres descartarlos y crear un proveedor nuevo?',
      })
      .subscribe((result: boolean): void => {
        if (result) {
          void this.createProveedorDraft();
        }
      });
  }

  closeProveedor(): void {
    if (this.proveedoresService.processing()) {
      return;
    }

    if (this.proveedoresService.workspace() === null) {
      return;
    }

    if (!this.proveedoresService.hasUnsavedChanges()) {
      void this.closeCurrentProveedor();

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
          void this.closeCurrentProveedor();
        }
      });
  }

  private async openProveedor(proveedor: Proveedor): Promise<void> {
    try {
      await this.proveedoresService.cerrarFicha();

      this.proveedoresService.abrirFicha(proveedor);

      this.closeSearch();
    } catch (error: unknown) {
      this.showWorkspaceError(error);
    }
  }

  private async createProveedorDraft(): Promise<void> {
    try {
      await this.proveedoresService.cerrarFicha();

      this.proveedoresService.crearBorrador();

      this.closeSearch();
    } catch (error: unknown) {
      this.showWorkspaceError(error);
    }
  }

  private async closeCurrentProveedor(): Promise<void> {
    try {
      await this.proveedoresService.cerrarFicha();
    } catch (error: unknown) {
      this.showWorkspaceError(error);
    }
  }

  private showWorkspaceError(error: unknown): void {
    this.dialog
      .alert({
        title: 'Error',
        content: getErrorMessage(error, 'No se ha podido descartar la ficha actual.'),
      })
      .subscribe();
  }
}
