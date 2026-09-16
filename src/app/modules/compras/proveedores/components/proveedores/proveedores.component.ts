import { Component, inject } from '@angular/core';
import type ProveedorWorkspaceSection from '@model/proveedores/proveedor-workspace-section.type';
import ProveedorSectionTabsComponent from '@modules/compras/proveedores/components/proveedor-section-tabs/proveedor-section-tabs.component';
import ProveedoresService from '@services/compras/proveedores.service';

/**
 * Muestra el workspace principal
 * de gestión de Proveedores.
 */
@Component({
  selector: 'otpv-proveedores',
  templateUrl: './proveedores.component.html',
  styleUrl: './proveedores.component.scss',
  imports: [ProveedorSectionTabsComponent],
})
export default class ProveedoresComponent {
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);

  /**
   * Cambia la sección activa
   * de la ficha de Proveedor.
   */
  selectSection(section: ProveedorWorkspaceSection): void {
    this.proveedoresService.seleccionarSeccion(section);
  }
}
