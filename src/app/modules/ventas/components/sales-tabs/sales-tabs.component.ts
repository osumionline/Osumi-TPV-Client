import {
  Component,
  computed,
  input,
  output,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';

/**
 * Muestra las ventas abiertas como pestañas y las acciones rápidas del módulo.
 */
@Component({
  selector: 'otpv-sales-tabs',
  templateUrl: './sales-tabs.component.html',
  styleUrl: './sales-tabs.component.scss',
  imports: [MatIconButton, MatIcon, MatTooltip],
})
export default class SalesTabsComponent {
  readonly ventas: InputSignal<readonly VentaEnCurso[]> = input.required<readonly VentaEnCurso[]>();

  readonly selectedId: InputSignal<string | null> = input.required<string | null>();

  readonly canCreate: InputSignal<boolean> = input<boolean>(true);

  readonly selectedVenta: Signal<VentaEnCurso | null> = computed((): VentaEnCurso | null => {
    const selectedId: string | null = this.selectedId();

    if (selectedId === null) {
      return null;
    }

    return (
      this.ventas().find((venta: VentaEnCurso): boolean => venta.idTemporal === selectedId) ?? null
    );
  });

  readonly selectTabEvent: OutputEmitterRef<string> = output<string>();

  readonly closeTabEvent: OutputEmitterRef<string> = output<string>();

  readonly newTabEvent: OutputEmitterRef<void> = output<void>();

  readonly clientEvent: OutputEmitterRef<void> = output<void>();

  /**
   * Selecciona la pestaña indicada.
   */
  selectTab(ventaIdTemporal: string): void {
    this.selectTabEvent.emit(ventaIdTemporal);
  }

  /**
   * Solicita el cierre de una pestaña sin propagar el click a su selección.
   */
  closeTab(event: MouseEvent, ventaIdTemporal: string): void {
    event.stopPropagation();
    this.closeTabEvent.emit(ventaIdTemporal);
  }

  /**
   * Solicita la creación de una nueva venta.
   */
  newTab(): void {
    if (!this.canCreate()) {
      return;
    }

    this.newTabEvent.emit();
  }

  /**
   * Solicita abrir la selección de cliente de la venta activa.
   */
  openClient(): void {
    if (this.selectedVenta() === null) {
      return;
    }

    this.clientEvent.emit();
  }
}
