import { Component, inject, signal, type WritableSignal } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type Proveedor from '@model/proveedores/proveedor.model';
import ProveedorSearchComponent from '@modules/compras/proveedores/components/proveedor-search/proveedor-search.component';
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
  imports: [MatIcon, MatIconButton, MatTooltip, ProveedorSearchComponent],
})
export default class ProveedorToolbarActionsComponent {
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);

  private readonly dialog: DialogService = inject(DialogService);

  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Muestra el buscador de Proveedores
   * ya cargados en memoria.
   */
  openSearch(): void {
    this.searchOpen.set(true);
  }

  /**
   * Cierra el buscador sin modificar
   * la ficha actualmente abierta.
   */
  closeSearch(): void {
    this.searchOpen.set(false);
  }

  /**
   * Abre el Proveedor seleccionado protegiendo
   * cualquier cambio pendiente del workspace.
   */
  selectProveedor(proveedor: Proveedor): void {
    const workspace = this.proveedoresService.workspace();

    if (workspace?.proveedorPublicId === proveedor.publicId) {
      this.closeSearch();

      return;
    }

    if (workspace === null || !this.proveedoresService.hasUnsavedChanges()) {
      this.openProveedor(proveedor);

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
          this.openProveedor(proveedor);
        }
      });
  }

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
   * Descarta la ficha anterior y abre
   * el Proveedor persistido indicado.
   */
  private openProveedor(proveedor: Proveedor): void {
    this.proveedoresService.cerrarFicha();

    this.proveedoresService.abrirFicha(proveedor);

    this.closeSearch();
  }

  /**
   * Descarta la ficha anterior y crea
   * el workspace vacío del nuevo Proveedor.
   */
  private createProveedorDraft(): void {
    this.proveedoresService.cerrarFicha();

    this.proveedoresService.crearBorrador();

    this.closeSearch();
  }
}
