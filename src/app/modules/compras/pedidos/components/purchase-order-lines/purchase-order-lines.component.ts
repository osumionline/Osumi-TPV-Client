import { DecimalPipe } from '@angular/common';
import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  inject,
  input,
  output,
  signal,
  viewChild,
  viewChildren,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type PurchaseOrderLineBarcodeChange from '@model/compras/pedidos/purchase-order-line-barcode-change.interface';
import PurchaseOrderLineCalculator from '@model/compras/pedidos/purchase-order-line-calculator';
import type PurchaseOrderLineEconomicChange from '@model/compras/pedidos/purchase-order-line-economic-change.interface';
import type PurchaseOrderLineMove from '@model/compras/pedidos/purchase-order-line-move.interface';
import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import type PurchaseOrderLineTaxChange from '@model/compras/pedidos/purchase-order-line-tax-change.interface';
import type PurchaseOrderLineUnitsChange from '@model/compras/pedidos/purchase-order-line-units-change.interface';
import type PurchaseOrderTaxPair from '@model/compras/pedidos/purchase-order-tax-pair.interface';
import {
  formatPurchaseOrderLineDecimal,
  isPurchaseOrderLineTransientDecimal,
  limitPurchaseOrderLineDecimalFraction,
  parsePurchaseOrderLineDecimal,
  type PurchaseOrderLineDecimalField,
} from '@modules/compras/pedidos/components/purchase-order-lines/purchase-order-lines.component.private';
import ArticleSearchComponent from '@modules/ventas/components/article-search/article-search.component';
import { DialogService } from '@osumi/angular-tools';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import ComprasService from '@services/compras.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Muestra las líneas que forman parte de un Pedido.
 */
@Component({
  selector: 'otpv-purchase-order-lines',
  templateUrl: './purchase-order-lines.component.html',
  styleUrl: './purchase-order-lines.component.scss',
  imports: [
    ArticleSearchComponent,
    BpsToPercentPipe,
    DecimalPipe,
    MicrosToEurosPipe,
    MatIcon,
    MatIconButton,
    MatTooltip,
  ],
})
export default class PurchaseOrderLinesComponent {
  private readonly comprasService: ComprasService = inject(ComprasService);
  private readonly dialog: DialogService = inject(DialogService);

  private readonly localizadorInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('localizadorInput');
  private readonly unitsInputs: Signal<readonly ElementRef<HTMLInputElement>[]> =
    viewChildren<ElementRef<HTMLInputElement>>('unitsInput');

  readonly lines: InputSignal<readonly PurchaseOrderLineState[]> =
    input.required<readonly PurchaseOrderLineState[]>();
  readonly visibleColumns: InputSignal<readonly number[]> = input.required<readonly number[]>();
  readonly recargoEquivalencia: InputSignal<boolean> = input.required<boolean>();
  readonly disabled: InputSignal<boolean> = input.required<boolean>();
  readonly taxPairs: InputSignal<readonly PurchaseOrderTaxPair[]> =
    input.required<readonly PurchaseOrderTaxPair[]>();

  readonly articlesSelected: OutputEmitterRef<readonly PedidoArticuloInterface[]> =
    output<readonly PedidoArticuloInterface[]>();
  readonly unitsChange: OutputEmitterRef<PurchaseOrderLineUnitsChange> =
    output<PurchaseOrderLineUnitsChange>();
  readonly lineMove: OutputEmitterRef<PurchaseOrderLineMove> = output<PurchaseOrderLineMove>();
  readonly barcodeChange: OutputEmitterRef<PurchaseOrderLineBarcodeChange> =
    output<PurchaseOrderLineBarcodeChange>();
  readonly economicChange: OutputEmitterRef<PurchaseOrderLineEconomicChange> =
    output<PurchaseOrderLineEconomicChange>();
  readonly taxChange: OutputEmitterRef<PurchaseOrderLineTaxChange> =
    output<PurchaseOrderLineTaxChange>();

  readonly lineDeleteRequested: OutputEmitterRef<string> = output<string>();

  readonly localizador: WritableSignal<string> = signal<string>('');
  readonly searching: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchInitialQuery: WritableSignal<string> = signal<string>('');
  readonly editingEconomicControl: WritableSignal<string | null> = signal<string | null>(null);
  readonly editingEconomicValue: WritableSignal<string> = signal<string>('');

  readonly visibleColumnIds: Signal<ReadonlySet<number>> = computed(
    (): ReadonlySet<number> => new Set<number>(this.visibleColumns()),
  );

  constructor() {
    afterNextRender((): void => {
      if (!this.disabled()) {
        this.focusLocalizador();
      }
    });
  }

  /**
   * Devuelve los IVAs configurados e incorpora,
   * cuando sea necesario, el valor histórico de la línea.
   */
  getIvaOptions(line: PurchaseOrderLineState): readonly number[] {
    return this.addHistoricalTaxValue(
      this.taxPairs().map((pair: PurchaseOrderTaxPair): number => pair.ivaBps),
      line.ivaBps,
    );
  }

  /**
   * Devuelve los RE configurados e incorpora,
   * cuando sea necesario, el valor histórico de la línea.
   */
  getRecargoEquivalenciaOptions(line: PurchaseOrderLineState): readonly number[] {
    return this.addHistoricalTaxValue(
      this.taxPairs().map((pair: PurchaseOrderTaxPair): number => pair.recargoEquivalenciaBps),
      line.recargoEquivalenciaBps,
    );
  }

  /**
   * Propaga un cambio fiscal realizado mediante
   * los selectores IVA o RE de una línea.
   */
  onTaxChange(
    line: PurchaseOrderLineState,
    field: 'ivaBps' | 'recargoEquivalenciaBps',
    event: Event,
  ): void {
    if (this.disabled()) {
      return;
    }

    const select: HTMLSelectElement = event.target as HTMLSelectElement;

    const value: number = Number(select.value);

    if (!Number.isSafeInteger(value) || value < 0) {
      return;
    }

    this.taxChange.emit({
      lineKey: line.key,
      field,
      value,
    });
  }

  /**
   * Propaga el código de barras adicional introducido
   * para una línea editable.
   */
  onBarcodeInput(line: PurchaseOrderLineState, event: Event): void {
    if (this.disabled() || line.tieneCodigoBarrasAdicional) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.barcodeChange.emit({
      lineKey: line.key,
      codigoBarras: inputElement.value.length === 0 ? null : inputElement.value,
    });
  }

  /**
   * Solicita mover una línea una posición
   * hacia arriba o hacia abajo.
   */
  moveLine(lineKey: string, direction: 'up' | 'down'): void {
    if (this.disabled()) {
      return;
    }

    this.lineMove.emit({
      lineKey,
      direction,
    });
  }

  /**
   * Solicita la eliminación de una línea editable.
   */
  requestLineDelete(lineKey: string): void {
    if (this.disabled()) {
      return;
    }

    this.lineDeleteRequested.emit(lineKey);
  }

  /**
   * Actualiza el contenido actual del localizador.
   */
  onLocalizadorInput(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.localizador.set(inputElement.value);
  }

  /**
   * Abre el buscador al comenzar a escribir un nombre
   * y resuelve códigos exactos al pulsar Enter.
   */
  onLocalizadorKeydown(event: KeyboardEvent): void {
    if (this.disabled() || this.searching()) {
      return;
    }

    if (/^\p{L}$/u.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();

      this.openSearch(`${this.localizador()}${event.key}`);

      return;
    }

    if (event.key !== 'Enter') {
      return;
    }

    event.preventDefault();

    void this.resolveLocalizador();
  }

  /**
   * Recibe los artículos elegidos en el buscador,
   * cierra el modal y los propaga al Pedido.
   */
  onSearchSelected(articulos: readonly PedidoArticuloInterface[]): void {
    this.searchOpen.set(false);
    this.localizador.set('');
    this.articlesSelected.emit(articulos);
    this.focusLocalizador();
  }

  /**
   * Cierra el buscador sin seleccionar artículos
   * y devuelve el foco al localizador.
   */
  closeSearch(): void {
    this.searchOpen.set(false);
    this.focusLocalizador();
  }

  /**
   * Actualiza las unidades cuando el valor introducido
   * representa un entero no negativo.
   */
  onUnitsInput(line: PurchaseOrderLineState, event: Event): void {
    if (this.disabled()) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const rawValue: string = inputElement.value.trim();

    if (rawValue.length === 0) {
      return;
    }

    const unidades: number = Number(rawValue);

    if (!Number.isSafeInteger(unidades) || unidades < 0) {
      return;
    }

    this.unitsChange.emit({
      lineKey: line.key,
      unidades,
    });
  }

  /**
   * Restaura el valor canónico de Unidades cuando el
   * contenido temporal del control no es válido.
   */
  onUnitsBlur(line: PurchaseOrderLineState, event: FocusEvent): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const unidades: number = Number(inputElement.value);

    if (inputElement.value.trim().length === 0 || !Number.isSafeInteger(unidades) || unidades < 0) {
      inputElement.value = String(line.unidades);
    }
  }

  /**
   * Selecciona el contenido completo de un editor numérico
   * al recibir el foco.
   */
  selectTableControl(event: FocusEvent): void {
    (event.target as HTMLInputElement).select();
  }

  /**
   * Enfoca el editor de Unidades correspondiente
   * a una línea ya existente.
   */
  focusUnits(lineKey: string): void {
    window.queueMicrotask((): void => {
      const input: HTMLInputElement | undefined = this.unitsInputs().find(
        (element: ElementRef<HTMLInputElement>): boolean =>
          element.nativeElement.dataset['lineKey'] === lineKey,
      )?.nativeElement;

      if (input === undefined) {
        return;
      }

      input.focus();
      input.select();
    });
  }

  /**
   * Inicia la edición de un campo económico
   * conservando literalmente el texto visible.
   */
  onEconomicFocus(
    line: PurchaseOrderLineState,
    field: PurchaseOrderLineDecimalField,
    event: FocusEvent,
  ): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.editingEconomicControl.set(this.getEconomicControlKey(line.key, field));

    this.editingEconomicValue.set(inputElement.value);

    inputElement.select();
  }

  /**
   * Procesa un decimal económico mientras el usuario
   * escribe sin interferir con valores transitorios.
   */
  onEconomicInput(
    line: PurchaseOrderLineState,
    field: PurchaseOrderLineDecimalField,
    event: Event,
  ): void {
    if (this.disabled()) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const fractionDigits: number = field === 'descuento' ? 2 : 6;

    const rawValue: string = limitPurchaseOrderLineDecimalFraction(
      inputElement.value,
      fractionDigits,
    );

    if (rawValue !== inputElement.value) {
      inputElement.value = rawValue;
    }

    this.editingEconomicValue.set(rawValue);

    if (isPurchaseOrderLineTransientDecimal(rawValue)) {
      return;
    }

    const value: number | null = parsePurchaseOrderLineDecimal(rawValue, fractionDigits);

    if (value === null || (field === 'descuento' && value > 10_000)) {
      return;
    }

    this.emitEconomicChange(line.key, field, value);
  }

  /**
   * Finaliza la edición económica y restaura el valor
   * canónico cuando la entrada no es válida.
   */
  onEconomicBlur(
    line: PurchaseOrderLineState,
    field: PurchaseOrderLineDecimalField,
    event: FocusEvent,
  ): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const fractionDigits: number = field === 'descuento' ? 2 : 6;

    const rawValue: string = inputElement.value.trim();

    const value: number | null = parsePurchaseOrderLineDecimal(rawValue, fractionDigits);

    if (value === null || (field === 'descuento' && value > 10_000)) {
      inputElement.value = this.formatEconomicValue(line, field);
    } else {
      this.emitEconomicChange(line.key, field, value);
    }

    this.editingEconomicControl.set(null);
    this.editingEconomicValue.set('');
  }

  /**
   * Obtiene el texto que debe mostrarse en un
   * editor económico de la tabla.
   */
  getEconomicInputValue(
    line: PurchaseOrderLineState,
    field: PurchaseOrderLineDecimalField,
  ): string {
    if (this.editingEconomicControl() === this.getEconomicControlKey(line.key, field)) {
      return this.editingEconomicValue();
    }

    return this.formatEconomicValue(line, field);
  }

  /**
   * Calcula el Total económico visible de una línea.
   */
  getLineTotalMicros(line: PurchaseOrderLineState): number {
    return PurchaseOrderLineCalculator.calcularTotalMicros(line);
  }

  /**
   * Añade un valor fiscal histórico a una lista
   * cuando ya no pertenece a la configuración actual.
   */
  private addHistoricalTaxValue(
    values: readonly number[],
    historicalValue: number,
  ): readonly number[] {
    const uniqueValues: number[] = [...new Set<number>(values)];

    if (!uniqueValues.includes(historicalValue)) {
      uniqueValues.push(historicalValue);
    }

    return uniqueValues;
  }

  /**
   * Genera la identidad de un editor económico
   * dentro de una línea concreta.
   */
  private getEconomicControlKey(lineKey: string, field: PurchaseOrderLineDecimalField): string {
    return `${lineKey}:${field}`;
  }

  /**
   * Formatea el valor canónico de un campo económico
   * para mostrarlo en su editor.
   */
  private formatEconomicValue(
    line: PurchaseOrderLineState,
    field: PurchaseOrderLineDecimalField,
  ): string {
    switch (field) {
      case 'palb':
        return formatPurchaseOrderLineDecimal(line.palbMicros, 6, 2);

      case 'descuento':
        return formatPurchaseOrderLineDecimal(line.descuentoBps, 2, 0);

      case 'pvp':
        return formatPurchaseOrderLineDecimal(line.pvpMicros, 6, 2);
    }
  }

  /**
   * Traduce el campo visual editado al contrato
   * económico utilizado por la ficha de Pedido.
   */
  private emitEconomicChange(
    lineKey: string,
    field: PurchaseOrderLineDecimalField,
    value: number,
  ): void {
    switch (field) {
      case 'palb':
        this.economicChange.emit({
          lineKey,
          field: 'palbMicros',
          value,
        });
        return;

      case 'descuento':
        this.economicChange.emit({
          lineKey,
          field: 'descuentoBps',
          value,
        });
        return;

      case 'pvp':
        this.economicChange.emit({
          lineKey,
          field: 'pvpMicros',
          value,
        });
        return;
    }
  }

  /**
   * Abre el buscador común de artículos con
   * el texto que ha iniciado la búsqueda.
   */
  private openSearch(query: string): void {
    this.searchInitialQuery.set(query);
    this.searchOpen.set(true);
  }

  /**
   * Resuelve el localizador, acceso directo o código
   * de barras introducido y añade el artículo encontrado.
   */
  private async resolveLocalizador(): Promise<void> {
    const codigo: string = this.localizador().trim();

    if (codigo.length === 0 || this.disabled() || this.searching()) {
      return;
    }

    this.searching.set(true);

    try {
      const articulo: PedidoArticuloInterface | null =
        await this.comprasService.resolvePedidoArticulo(codigo);

      if (articulo === null) {
        this.dialog
          .alert({
            title: 'Artículo no encontrado',
            content: 'El código introducido no corresponde a ningún artículo.',
          })
          .subscribe((): void => {
            this.localizador.set('');
            this.focusLocalizador();
          });

        return;
      }

      this.localizador.set('');
      this.articlesSelected.emit([articulo]);
      this.focusLocalizador();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido resolver el artículo.'),
        })
        .subscribe((): void => {
          this.focusLocalizador();
        });
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Devuelve el foco al campo Localizador cuando
   * el Pedido continúa siendo editable.
   */
  private focusLocalizador(): void {
    if (this.disabled()) {
      return;
    }

    this.localizadorInput()?.nativeElement.focus();
  }
}
