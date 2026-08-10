import { Component, inject, type OnInit } from '@angular/core';
import VentasContextService from '@services/ventas-context.service';
import VentasService from '@services/ventas.service';

/**
 * Página principal del módulo de ventas.
 */
@Component({
  selector: 'otpv-sales',
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
})
export default class SalesComponent implements OnInit {
  readonly ventasContextService: VentasContextService = inject(VentasContextService);
  readonly ventasService: VentasService = inject(VentasService);

  /**
   * Refresca el contexto operativo cada vez que se entra en el módulo.
   */
  ngOnInit(): void {
    void this.ventasContextService.reload().catch((): void => undefined);
  }
}
