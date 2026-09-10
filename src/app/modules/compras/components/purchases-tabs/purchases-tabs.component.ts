import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type ComprasSection from '@model/compras/compras-section.type';
import {
  PURCHASES_SECTIONS,
  type PurchasesSectionDefinition,
} from '@modules/compras/components/purchases-tabs/purchases-tabs.component.private';

/**
 * Muestra las secciones disponibles del módulo de Compras.
 */
@Component({
  selector: 'otpv-purchases-tabs',
  templateUrl: './purchases-tabs.component.html',
  styleUrl: './purchases-tabs.component.scss',
})
export default class PurchasesTabsComponent {
  readonly activeSection: InputSignal<ComprasSection> = input.required<ComprasSection>();
  readonly selectSectionEvent: OutputEmitterRef<ComprasSection> = output<ComprasSection>();
  readonly sections: readonly PurchasesSectionDefinition[] = PURCHASES_SECTIONS;

  /**
   * Solicita cambiar la sección activa de Compras.
   */
  selectSection(section: ComprasSection): void {
    this.selectSectionEvent.emit(section);
  }
}
