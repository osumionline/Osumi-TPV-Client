import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import MarcasService from '@services/compras/marcas.service';

/**
 * Muestra las acciones contextuales disponibles
 * para la sección de Marcas de Compras.
 */
@Component({
  selector: 'otpv-marca-toolbar-actions',
  templateUrl: './marca-toolbar-actions.component.html',
  styleUrl: './marca-toolbar-actions.component.scss',
  imports: [MatIconButton, MatIcon, MatTooltip],
})
export default class MarcaToolbarActionsComponent {
  readonly marcasService: MarcasService = inject(MarcasService);

  /**
   * Abre una ficha temporal para crear una Marca nueva.
   */
  newMarca(): void {
    if (this.marcasService.dirty()) {
      return;
    }

    this.marcasService.crearBorrador();
  }

  /**
   * Cierra la ficha actual cuando no contiene
   * modificaciones pendientes.
   */
  closeMarca(): void {
    if (this.marcasService.dirty()) {
      return;
    }

    this.marcasService.cerrarFicha();
  }
}
