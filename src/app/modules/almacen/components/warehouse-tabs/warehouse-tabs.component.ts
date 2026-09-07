import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type AlmacenSection from '@model/almacen/almacen-section.type';

interface WarehouseSectionDefinition {
  readonly id: AlmacenSection;
  readonly label: string;
}

const WAREHOUSE_SECTIONS: readonly WarehouseSectionDefinition[] = [
  {
    id: 'inventory',
    label: 'INVENTARIO',
  },
  {
    id: 'expirations',
    label: 'CADUCIDADES',
  },
  {
    id: 'printing',
    label: 'IMPRENTA',
  },
];

/**
 * Muestra las secciones disponibles del módulo de Almacén.
 */
@Component({
  selector: 'otpv-warehouse-tabs',
  templateUrl: './warehouse-tabs.component.html',
  styleUrl: './warehouse-tabs.component.scss',
})
export default class WarehouseTabsComponent {
  readonly activeSection: InputSignal<AlmacenSection> = input.required<AlmacenSection>();
  readonly selectSectionEvent: OutputEmitterRef<AlmacenSection> = output<AlmacenSection>();
  readonly sections: readonly WarehouseSectionDefinition[] = WAREHOUSE_SECTIONS;

  /**
   * Solicita cambiar la sección activa de Almacén.
   */
  selectSection(section: AlmacenSection): void {
    this.selectSectionEvent.emit(section);
  }
}
