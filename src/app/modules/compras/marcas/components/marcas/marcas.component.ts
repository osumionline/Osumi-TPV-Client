import { Component, inject } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type MarcaWorkspaceSection from '@model/marcas/marca-workspace-section.type';
import MarcaSectionTabsComponent from '@modules/compras/marcas/components/marca-section-tabs/marca-section-tabs.component';
import MarcasService from '@services/compras/marcas.service';

/**
 * Muestra el workspace principal de gestión de Marcas.
 */
@Component({
  selector: 'otpv-marcas',
  templateUrl: './marcas.component.html',
  styleUrl: './marcas.component.scss',
  imports: [MarcaSectionTabsComponent, MatIconButton, MatIcon, MatTooltip],
})
export default class MarcasComponent {
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

  /**
   * Cambia la sección activa de la ficha de Marca.
   */
  selectSection(section: MarcaWorkspaceSection): void {
    this.marcasService.seleccionarSeccion(section);
  }
}
