import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type ProveedorWorkspaceSection from '@model/proveedores/proveedor-workspace-section.type';
import type ProveedorWorkspace from '@model/proveedores/proveedor-workspace.interface';
import {
  getProveedorSectionDefinitions,
  type ProveedorSectionDefinition,
} from '@modules/compras/proveedores/components/proveedor-section-tabs/proveedor-section-tabs.component.private';

/**
 * Muestra las secciones disponibles
 * de la ficha de Proveedor.
 */
@Component({
  selector: 'otpv-proveedor-section-tabs',
  templateUrl: './proveedor-section-tabs.component.html',
  styleUrl: './proveedor-section-tabs.component.scss',
})
export default class ProveedorSectionTabsComponent {
  readonly workspace: InputSignal<ProveedorWorkspace> = input.required<ProveedorWorkspace>();

  readonly disabled: InputSignal<boolean> = input<boolean>(false);

  readonly selectSectionEvent: OutputEmitterRef<ProveedorWorkspaceSection> =
    output<ProveedorWorkspaceSection>();

  /**
   * Recupera las secciones visibles para
   * el workspace de Proveedor actual.
   */
  getSections(): readonly ProveedorSectionDefinition[] {
    return getProveedorSectionDefinitions(this.workspace().proveedorId !== null);
  }

  /**
   * Solicita cambiar la sección activa.
   */
  selectSection(section: ProveedorWorkspaceSection): void {
    if (this.disabled()) {
      return;
    }

    this.selectSectionEvent.emit(section);
  }
}
