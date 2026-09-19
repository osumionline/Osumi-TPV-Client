import {
  type Signal,
  type WritableSignal,
  Component,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatTabGroup, MatTabsModule } from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';

const EFECTIVO_SLUG: string = 'efectivo';

/**
 * Muestra y permite seleccionar los tipos de pago
 * configurables desde el apartado de Gestión.
 */
@Component({
  selector: 'otpv-management-payment-types',
  templateUrl: './management-payment-types.component.html',
  styleUrl: './management-payment-types.component.scss',
  imports: [RouterLink, MatButton, MatFormFieldModule, MatIcon, MatInput, MatTabsModule],
})
export default class ManagementPaymentTypesComponent {
  private readonly tiposPagoService: TiposPagoService = inject(TiposPagoService);

  private readonly tabs = viewChild(MatTabGroup);

  readonly searchTerm: WritableSignal<string> = signal<string>('');
  readonly selectedTipoPago: WritableSignal<TipoPago | null> = signal<TipoPago | null>(null);
  readonly creatingTipoPago: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Subconjunto configurable desde Gestión.
   *
   * Efectivo pertenece al maestro global pero es
   * estructural y no puede gestionarse desde aquí.
   */
  readonly tiposPagoConfigurables: Signal<readonly TipoPago[]> = computed((): readonly TipoPago[] =>
    this.tiposPagoService
      .tiposPago()
      .filter(
        (tipoPago: TipoPago): boolean => tipoPago.slug.toLocaleLowerCase('es-ES') !== EFECTIVO_SLUG,
      ),
  );

  readonly filteredTiposPago: Signal<readonly TipoPago[]> = computed((): readonly TipoPago[] => {
    const searchTerm: string = this.searchTerm().trim().toLocaleLowerCase('es-ES');

    if (searchTerm === '') {
      return this.tiposPagoConfigurables();
    }

    return this.tiposPagoConfigurables().filter((tipoPago: TipoPago): boolean =>
      tipoPago.nombre.toLocaleLowerCase('es-ES').includes(searchTerm),
    );
  });

  /**
   * Actualiza el texto utilizado para
   * filtrar los tipos de pago.
   */
  updateSearchTerm(value: string): void {
    this.searchTerm.set(value);
  }

  /**
   * Selecciona un tipo de pago existente
   * para mostrarlo en el área principal.
   */
  selectTipoPago(tipoPago: TipoPago): void {
    this.creatingTipoPago.set(false);
    this.selectedTipoPago.set(tipoPago);

    this.showDataTab();
  }

  /**
   * Abre el área principal en modo
   * creación de un nuevo tipo de pago.
   */
  startCreatingTipoPago(): void {
    this.selectedTipoPago.set(null);
    this.creatingTipoPago.set(true);

    this.showDataTab();
  }

  /**
   * Devuelve el editor a la pestaña Datos
   * cuando ya se encuentra renderizado.
   */
  private showDataTab(): void {
    const tabs: MatTabGroup | undefined = this.tabs();

    if (tabs !== undefined) {
      tabs.selectedIndex = 0;
    }
  }
}
