import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import {
  appendArticuloBarcode,
  removeArticuloBarcode,
  validateArticuloBarcodes,
} from '@model/articulos/articulo-barcode.utils';
import type {
  ArticuloCodigoBarrasDraft,
  ArticuloDraftPatch,
} from '@model/articulos/articulo-draft.interface';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import { QRCodeComponent } from 'angularx-qrcode';

/**
 * Gestiona los códigos de barras adicionales de un artículo.
 */
@Component({
  selector: 'otpv-article-barcodes',
  templateUrl: './article-barcodes.component.html',
  styleUrl: './article-barcodes.component.scss',
  imports: [MatButton, MatIcon, MatIconButton, MatTooltip, QRCodeComponent],
})
export default class ArticleBarcodesComponent {
  private readonly newBarcodeInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('newBarcodeInput');

  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly draftChangeEvent: OutputEmitterRef<ArticuloDraftPatch> = output<ArticuloDraftPatch>();

  readonly newBarcode: WritableSignal<string> = signal<string>('');
  readonly addError: WritableSignal<string | null> = signal<string | null>(null);
  readonly defaultBarcode: Signal<string | null> = computed((): string | null => {
    const localizador: number | null = this.tab().draft.localizador;

    return localizador === null ? null : String(localizador);
  });

  constructor() {
    afterNextRender((): void => {
      this.newBarcodeInput().nativeElement.focus();
    });
  }

  /**
   * Actualiza el código pendiente de añadir.
   */
  onNewBarcodeInput(event: Event): void {
    const inputElement: HTMLInputElement = event.currentTarget as HTMLInputElement;

    this.newBarcode.set(inputElement.value);
    this.addError.set(null);
  }

  /**
   * Añade el código pendiente al draft.
   */
  addBarcode(): void {
    const normalizedCode: string = this.newBarcode().trim();

    if (normalizedCode === '') {
      return;
    }

    const nextCodes: readonly ArticuloCodigoBarrasDraft[] = appendArticuloBarcode(
      this.tab().draft.codigosBarrasAdicionales,
      normalizedCode,
    );
    const error: string | null = validateArticuloBarcodes(
      nextCodes,
      this.tab().draft.localizador,
      this.tab().draft.accesoDirecto,
    );

    if (error !== null) {
      this.addError.set(error);
      return;
    }

    this.addError.set(null);
    this.draftChangeEvent.emit({
      codigosBarrasAdicionales: nextCodes,
    });
    this.newBarcode.set('');

    queueMicrotask((): void => {
      this.newBarcodeInput().nativeElement.focus();
    });
  }

  /**
   * Añade el código cuando el lector o teclado envía Enter.
   */
  onNewBarcodeKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();
    this.addBarcode();
  }

  /**
   * Elimina un código adicional del draft.
   */
  removeBarcode(index: number): void {
    this.draftChangeEvent.emit({
      codigosBarrasAdicionales: removeArticuloBarcode(
        this.tab().draft.codigosBarrasAdicionales,
        index,
      ),
    });
  }
}
