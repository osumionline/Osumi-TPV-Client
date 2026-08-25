import {
  Component,
  ElementRef,
  output,
  signal,
  viewChild,
  type AfterViewInit,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';

type HistoricalSalesTab = 'ventas' | 'salidas-caja';

/**
 * Muestra el modal de Histórico disponible desde el workspace de Ventas.
 */
@Component({
  selector: 'otpv-historical-sales',
  templateUrl: './historical-sales.component.html',
  styleUrl: './historical-sales.component.scss',
  imports: [MatIcon, MatIconButton],
})
export default class HistoricalSalesComponent implements AfterViewInit {
  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly activeTab: WritableSignal<HistoricalSalesTab> = signal<HistoricalSalesTab>('ventas');

  private readonly closeButton: Signal<ElementRef<HTMLButtonElement> | undefined> =
    viewChild<ElementRef<HTMLButtonElement>>('closeButton');

  /**
   * Sitúa el foco inicial en un control interactivo del diálogo.
   */
  ngAfterViewInit(): void {
    this.closeButton()?.nativeElement.focus();
  }

  /**
   * Cambia la pestaña activa del Histórico.
   */
  selectTab(tab: HistoricalSalesTab): void {
    this.activeTab.set(tab);
  }

  /**
   * Solicita cerrar el modal de Histórico.
   */
  close(): void {
    this.closeEvent.emit();
  }
}
