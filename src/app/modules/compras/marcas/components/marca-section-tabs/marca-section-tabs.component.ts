import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type MarcaWorkspaceSection from '@model/marcas/marca-workspace-section.type';
import type MarcaWorkspace from '@model/marcas/marca-workspace.interface';
import {
  getMarcaSectionDefinitions,
  type MarcaSectionDefinition,
} from '@modules/compras/marcas/components/marca-section-tabs/marca-section-tabs.component.private';

/**
 * Muestra las secciones disponibles de la ficha de Marca.
 */
@Component({
  selector: 'otpv-marca-section-tabs',
  templateUrl: './marca-section-tabs.component.html',
  styleUrl: './marca-section-tabs.component.scss',
})
export default class MarcaSectionTabsComponent {
  readonly workspace: InputSignal<MarcaWorkspace> = input.required<MarcaWorkspace>();

  readonly disabled: InputSignal<boolean> = input<boolean>(false);

  readonly selectSectionEvent: OutputEmitterRef<MarcaWorkspaceSection> =
    output<MarcaWorkspaceSection>();

  /**
   * Recupera las secciones visibles para
   * el workspace de Marca actual.
   */
  getSections(): readonly MarcaSectionDefinition[] {
    return getMarcaSectionDefinitions(this.workspace().marcaId !== null);
  }

  /**
   * Solicita cambiar la sección activa.
   */
  selectSection(section: MarcaWorkspaceSection): void {
    if (this.disabled()) {
      return;
    }

    this.selectSectionEvent.emit(section);
  }
}
