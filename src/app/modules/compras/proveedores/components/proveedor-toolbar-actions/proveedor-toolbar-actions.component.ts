import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { DialogService } from '@osumi/angular-tools';
import ProveedoresService from '@services/compras/proveedores.service';

/**
 * Muestra las acciones contextuales disponibles
 * para la sección de Proveedores de Compras.
 */
@Component({
  selector: 'otpv-proveedor-toolbar-actions',
  templateUrl: './proveedor-toolbar-actions.component.html',
  styleUrl: './proveedor-toolbar-actions.component.scss',
  imports: [MatIcon, MatIconButton, MatTooltip],
})
export default class ProveedorToolbarActionsComponent {
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);

  private readonly dialog: DialogService = inject(DialogService);

  /**
   * Abre un borrador nuevo protegiendo
   * cualquier cambio pendiente.
   */
  newProveedor(): void {
    if (!this.proveedoresService.hasUnsavedChanges()) {
      this.createProveedorDraft();

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
          this.createProveedorDraft();
        }
      });
  }

  /**
   * Cierra la ficha actual protegiendo cualquier
   * cambio pendiente del Proveedor o Comercial.
   */
  closeProveedor(): void {
    if (this.proveedoresService.workspace() === null) {
      return;
    }

    if (!this.proveedoresService.hasUnsavedChanges()) {
      this.proveedoresService.cerrarFicha();

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
          this.proveedoresService.cerrarFicha();
        }
      });
  }

  /**
   * Descarta la ficha anterior y crea
   * el workspace vacío del nuevo Proveedor.
   */
  private createProveedorDraft(): void {
    this.proveedoresService.cerrarFicha();
    this.proveedoresService.crearBorrador();
  }
}
