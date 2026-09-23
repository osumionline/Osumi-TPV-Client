import { Component, input, signal, type InputSignal, type WritableSignal } from '@angular/core';
import type { InformeVentasResultado } from '@desktop-contracts/caja/informes/informe-ventas.interface';
import SalesReportCategoryComponent from '@modules/caja/components/sales-report-category/sales-report-category.component';

/**
 * Presenta el Informe de Ventas
 * y gestiona su modo de agrupación.
 */
@Component({
  selector: 'otpv-sales-report',
  templateUrl: './sales-report.component.html',
  styleUrl: './sales-report.component.scss',
  imports: [SalesReportCategoryComponent],
})
export default class SalesReportComponent {
  readonly result: InputSignal<InformeVentasResultado> = input.required<InformeVentasResultado>();

  readonly groupByBrand: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Cambia entre la vista por artículos
   * y la vista agrupada por marca.
   */
  setGroupByBrand(value: boolean): void {
    this.groupByBrand.set(value);
  }
}
