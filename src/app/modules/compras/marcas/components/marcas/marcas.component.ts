import { Component, inject } from '@angular/core';
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
  imports: [MarcaSectionTabsComponent],
})
export default class MarcasComponent {
  readonly marcasService: MarcasService = inject(MarcasService);

  /**
   * Cambia la sección activa de la ficha de Marca.
   */
  selectSection(section: MarcaWorkspaceSection): void {
    this.marcasService.seleccionarSeccion(section);
  }
}
