import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type { ArticuloDraft, ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';
import ArticuloPriceCalculator from '@model/articulos/articulo-price-calculator';
import {
  formatScaledDecimal,
  rescaleScaledInteger,
} from '@model/articulos/articulo-scaled-decimal.utils';

/**
 * Muestra el PVP resultante para los márgenes
 * configurados en la instalación.
 */
@Component({
  selector: 'otpv-article-margin-suggestions',
  templateUrl: './article-margin-suggestions.component.html',
  styleUrl: './article-margin-suggestions.component.scss',
  imports: [MatIcon, MatIconButton],
})
export default class ArticleMarginSuggestionsComponent {
  readonly draft: InputSignal<ArticuloDraft> = input.required<ArticuloDraft>();
  readonly margins: InputSignal<readonly number[]> = input.required<readonly number[]>();
  readonly selectEvent: OutputEmitterRef<number> = output<number>();
  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  /**
   * Formatea un margen con un máximo de dos decimales.
   */
  formatMargin(margenMicroporcentaje: number): string {
    return formatScaledDecimal(rescaleScaledInteger(margenMicroporcentaje, 6, 2), 2);
  }

  /**
   * Calcula y formatea el PVP correspondiente a un margen.
   */
  formatPvp(margenMicroporcentaje: number): string {
    const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarMargen(
      this.draft(),
      margenMicroporcentaje,
    );
    const pvpCents: number | undefined = patch.pvpCents;

    if (pvpCents === undefined) {
      return '—';
    }

    return formatScaledDecimal(pvpCents, 2, 2);
  }

  /**
   * Selecciona uno de los márgenes sugeridos.
   */
  selectMargin(margenMicroporcentaje: number): void {
    this.selectEvent.emit(margenMicroporcentaje);
  }

  /**
   * Cierra el selector de márgenes.
   */
  close(): void {
    this.closeEvent.emit();
  }
}
