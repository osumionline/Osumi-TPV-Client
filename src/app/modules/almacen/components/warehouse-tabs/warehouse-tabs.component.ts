import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type AlmacenSection from '@model/almacen/almacen-section.type';
import {
  WAREHOUSE_SECTIONS,
  type WarehouseSectionDefinition,
} from '@modules/almacen/components/warehouse-tabs/warehouse-tabs.component.private';

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
