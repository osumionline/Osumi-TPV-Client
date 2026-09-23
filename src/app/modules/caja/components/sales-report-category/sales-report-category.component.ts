import {
  Component,
  computed,
  forwardRef,
  input,
  signal,
  type InputSignal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import type { InformeVentasCategoria } from '@desktop-contracts/caja/informes/informe-ventas.interface';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';

/**
 * Renderiza recursivamente una rama
 * del Informe de Ventas.
 */
@Component({
  selector: 'otpv-sales-report-category',
  templateUrl: './sales-report-category.component.html',
  styleUrl: './sales-report-category.component.scss',
  imports: [
    BpsToPercentPipe,
    CurrencyPipe,
    DecimalPipe,
    MicrosToEurosPipe,

    /*
     * La referencia diferida permite que el
     * componente se utilice recursivamente.
     */
    forwardRef(() => SalesReportCategoryComponent),
  ],
})
export default class SalesReportCategoryComponent {
  readonly categoria: InputSignal<InformeVentasCategoria> =
    input.required<InformeVentasCategoria>();

  readonly groupByBrand: InputSignal<boolean> = input.required<boolean>();

  readonly depth: InputSignal<number> = input<number>(0);

  readonly expanded: WritableSignal<boolean> = signal<boolean>(true);

  readonly hasChildren: Signal<boolean> = computed((): boolean => {
    const categoria: InformeVentasCategoria = this.categoria();

    const directItems: number = this.groupByBrand()
      ? categoria.marcas.length
      : categoria.articulos.length;

    return directItems > 0 || categoria.subcategorias.length > 0;
  });

  /**
   * Alterna la visibilidad en pantalla
   * de los contenidos de la categoría.
   */
  toggle(): void {
    if (!this.hasChildren()) {
      return;
    }

    this.expanded.update((value: boolean): boolean => !value);
  }
}
