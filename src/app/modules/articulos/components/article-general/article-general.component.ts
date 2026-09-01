import {
  Component,
  computed,
  inject,
  input,
  OnInit,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type { ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';
import ArticuloPriceCalculator from '@model/articulos/articulo-price-calculator';
import {
  formatScaledDecimal,
  numberToScaledInteger,
  parseScaledDecimal,
} from '@model/articulos/articulo-scaled-decimal.utils';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import type Categoria from '@model/categorias/categoria.model';
import type Marca from '@model/marcas/marca.model';
import type Proveedor from '@model/proveedores/proveedor.model';
import BrandQuickCreateComponent from '@modules/articulos/components/brand-quick-create/brand-quick-create.component';
import ProviderQuickCreateComponent from '@modules/articulos/components/provider-quick-create/provider-quick-create.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import CategoriasService from '@services/categorias.service';
import MarcasService from '@services/marcas.service';
import ProveedoresService from '@services/proveedores.service';
import { getErrorMessage } from '@utils/error.utils';

type ArticleIntegerField = 'stock' | 'stockMin' | 'stockMax' | 'loteOptimo';

type ArticlePriceField =
  'precioAlbaran' | 'puc' | 'margen' | 'pvp' | 'margenDescuento' | 'pvpDescuento';

interface ArticleFiscalOption {
  readonly key: string;
  readonly ivaBps: number;
  readonly reBps: number;
}

/**
 * Edita los datos generales de una ficha de artículo.
 */
@Component({
  selector: 'otpv-article-general',
  templateUrl: './article-general.component.html',
  styleUrl: './article-general.component.scss',
  imports: [
    BrandQuickCreateComponent,
    MatButton,
    MatIconButton,
    MatIcon,
    ProviderQuickCreateComponent,
  ],
})
export default class ArticleGeneralComponent implements OnInit {
  readonly appDataService: AppDataService = inject(AppDataService);
  readonly marcasService: MarcasService = inject(MarcasService);
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);
  readonly categoriasService: CategoriasService = inject(CategoriasService);
  private readonly dialog: DialogService = inject(DialogService);

  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly draftChangeEvent: OutputEmitterRef<ArticuloDraftPatch> = output<ArticuloDraftPatch>();

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);
  readonly calculationError: WritableSignal<string | null> = signal<string | null>(null);
  readonly marcaModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly proveedorModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly creatingMarca: WritableSignal<boolean> = signal<boolean>(false);
  readonly creatingProveedor: WritableSignal<boolean> = signal<boolean>(false);
  readonly marcaCreateError: WritableSignal<string | null> = signal<string | null>(null);
  readonly proveedorCreateError: WritableSignal<string | null> = signal<string | null>(null);
  readonly fiscalOptions: Signal<readonly ArticleFiscalOption[]> = computed(
    (): readonly ArticleFiscalOption[] => this.buildFiscalOptions(),
  );
  readonly marginOptions: Signal<readonly number[]> = computed((): readonly number[] =>
    this.buildMarginOptions(),
  );

  /**
   * Carga los datos maestros necesarios para General.
   */
  ngOnInit(): void {
    void this.loadMasterData();
  }

  /**
   * Actualiza la marca seleccionada.
   */
  onMarcaChange(event: Event): void {
    const selectElement: HTMLSelectElement = event.target as HTMLSelectElement;

    this.draftChangeEvent.emit({
      idMarca: this.parseSelectedId(selectElement.value),
    });
  }

  /**
   * Actualiza el proveedor seleccionado.
   */
  onProveedorChange(event: Event): void {
    const selectElement: HTMLSelectElement = event.target as HTMLSelectElement;

    this.draftChangeEvent.emit({
      idProveedor: this.parseSelectedId(selectElement.value),
    });
  }

  /**
   * Abre el formulario de creación rápida de Marca.
   */
  openMarcaModal(): void {
    this.marcaCreateError.set(null);
    this.marcaModalOpen.set(true);
  }

  /**
   * Cierra el formulario de Marca si no hay una creación en curso.
   */
  closeMarcaModal(): void {
    if (!this.creatingMarca()) {
      this.marcaModalOpen.set(false);
      this.marcaCreateError.set(null);
    }
  }

  /**
   * Crea una marca y la selecciona inmediatamente en la ficha.
   */
  async createMarca(command: CrearMarcaCommand): Promise<void> {
    if (this.creatingMarca()) {
      return;
    }

    this.creatingMarca.set(true);
    this.marcaCreateError.set(null);

    try {
      const marca: Marca = await this.marcasService.create(command);

      if (marca.id === null) {
        throw new Error('La marca creada no dispone de identificador.');
      }

      this.draftChangeEvent.emit({
        idMarca: marca.id,
      });
      this.marcaModalOpen.set(false);

      if (command.crearProveedor) {
        try {
          await this.proveedoresService.reload();
        } catch (error: unknown) {
          this.dialog
            .alert({
              title: 'Atención',
              content: getErrorMessage(
                error,
                'La marca y su proveedor se han creado, pero no se ha podido actualizar la lista de proveedores.',
              ),
            })
            .subscribe();
        }
      }
    } catch (error: unknown) {
      this.marcaCreateError.set(getErrorMessage(error, 'No se ha podido crear la marca.'));
    } finally {
      this.creatingMarca.set(false);
    }
  }

  /**
   * Abre el formulario de creación rápida de Proveedor.
   */
  openProveedorModal(): void {
    this.proveedorCreateError.set(null);
    this.proveedorModalOpen.set(true);
  }

  /**
   * Cierra el formulario de Proveedor si no hay una creación en curso.
   */
  closeProveedorModal(): void {
    if (!this.creatingProveedor()) {
      this.proveedorModalOpen.set(false);
      this.proveedorCreateError.set(null);
    }
  }

  /**
   * Crea un proveedor y lo selecciona inmediatamente en la ficha.
   */
  async createProveedor(command: CrearProveedorCommand): Promise<void> {
    if (this.creatingProveedor()) {
      return;
    }

    this.creatingProveedor.set(true);
    this.proveedorCreateError.set(null);

    try {
      const proveedor: Proveedor = await this.proveedoresService.create(command);

      if (proveedor.id === null) {
        throw new Error('El proveedor creado no dispone de identificador.');
      }

      this.draftChangeEvent.emit({
        idProveedor: proveedor.id,
      });
      this.proveedorModalOpen.set(false);
    } catch (error: unknown) {
      this.proveedorCreateError.set(getErrorMessage(error, 'No se ha podido crear el proveedor.'));
    } finally {
      this.creatingProveedor.set(false);
    }
  }

  /**
   * Cambia el par IVA/RE seleccionado y recalcula
   * los precios dependientes.
   */
  onFiscalOptionChange(event: Event): void {
    const selectElement: HTMLSelectElement = event.target as HTMLSelectElement;
    const option: ArticleFiscalOption | undefined = this.fiscalOptions().find(
      (item: ArticleFiscalOption): boolean => item.key === selectElement.value,
    );

    if (option === undefined) {
      this.restoreFiscalSelection(selectElement);
      return;
    }

    try {
      const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarFiscalidad(
        this.tab().draft,
        option.ivaBps,
        option.reBps,
      );

      this.calculationError.set(null);
      this.draftChangeEvent.emit(patch);
    } catch (error: unknown) {
      this.calculationError.set(
        getErrorMessage(error, 'No se ha podido actualizar la fiscalidad.'),
      );
      this.restoreFiscalSelection(selectElement);
    }
  }

  /**
   * Indica si una opción fiscal corresponde al artículo actual.
   */
  isFiscalOptionSelected(option: ArticleFiscalOption): boolean {
    return option.ivaBps === this.tab().draft.ivaBps && option.reBps === this.tab().draft.reBps;
  }

  /**
   * Indica si la instalación utiliza recargo de equivalencia.
   */
  usesRecargoEquivalencia(): boolean {
    return this.appDataService.appData()?.tipoIva === 're';
  }

  /**
   * Indica si ya existe fiscalidad suficiente para editar precios.
   */
  hasFiscalidad(): boolean {
    return this.tab().draft.ivaBps !== null && this.tab().draft.reBps !== null;
  }

  /**
   * Activa o desactiva el sistema de descuento.
   */
  onDescuentoChange(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    try {
      const patch: ArticuloDraftPatch = inputElement.checked
        ? ArticuloPriceCalculator.activarDescuento(this.tab().draft)
        : ArticuloPriceCalculator.desactivarDescuento();

      this.calculationError.set(null);
      this.draftChangeEvent.emit(patch);
    } catch (error: unknown) {
      this.calculationError.set(getErrorMessage(error, 'No se ha podido modificar el descuento.'));
      inputElement.checked = this.hasDescuento();
    }
  }

  /**
   * Cambia el porcentaje de descuento.
   */
  onDiscountPercentageChange(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const value: number | null = parseScaledDecimal(inputElement.value, 6);

    if (value === null) {
      this.calculationError.set('El valor de Descuento no es válido.');
      this.restoreDiscountInput(inputElement);
      return;
    }

    try {
      const patch: ArticuloDraftPatch = ArticuloPriceCalculator.actualizarDescuento(
        this.tab().draft,
        value,
      );

      this.calculationError.set(null);
      this.draftChangeEvent.emit(patch);
    } catch (error: unknown) {
      this.calculationError.set(getErrorMessage(error, 'No se ha podido actualizar el descuento.'));
      this.restoreDiscountInput(inputElement);
    }
  }

  /**
   * Indica si el artículo tiene descuento activo.
   */
  hasDescuento(): boolean {
    return ArticuloPriceCalculator.tieneDescuento(this.tab().draft);
  }

  /**
   * Obtiene el porcentaje efectivo de descuento.
   */
  getDescuentoMicroporcentaje(): number {
    return ArticuloPriceCalculator.obtenerDescuentoMicroporcentaje(this.tab().draft) ?? 0;
  }

  /**
   * Procesa la modificación de un campo de precio o margen.
   */
  onPriceChange(event: Event, field: ArticlePriceField): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const value: number | null = parseScaledDecimal(
      inputElement.value,
      this.getPriceScaleDigits(field),
    );

    if (value === null) {
      this.calculationError.set(`El valor de ${this.getPriceFieldLabel(field)} no es válido.`);
      this.restorePriceInput(inputElement, field);
      return;
    }

    try {
      const patch: ArticuloDraftPatch = this.calculatePricePatch(field, value);

      this.calculationError.set(null);
      this.draftChangeEvent.emit(patch);
    } catch (error: unknown) {
      this.calculationError.set(
        getErrorMessage(error, `No se ha podido actualizar ${this.getPriceFieldLabel(field)}.`),
      );
      this.restorePriceInput(inputElement, field);
    }
  }

  /**
   * Formatea un precio almacenado en microeuros.
   */
  formatMicros(value: number): string {
    return formatScaledDecimal(value, 6, 2);
  }

  /**
   * Formatea un precio almacenado en céntimos.
   */
  formatCents(value: number): string {
    return formatScaledDecimal(value, 2, 2);
  }

  /**
   * Formatea un margen almacenado en microporcentaje.
   */
  formatMargin(value: number): string {
    return formatScaledDecimal(value, 6);
  }

  /**
   * Formatea un tipo fiscal almacenado en basis points.
   */
  formatBps(value: number): string {
    return formatScaledDecimal(value, 2);
  }

  /**
   * Añade o elimina una categoría del artículo.
   */
  onCategoriaChange(event: Event, idCategoria: number): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const idsCategorias: Set<number> = new Set<number>(this.tab().draft.idsCategorias);

    if (inputElement.checked) {
      idsCategorias.add(idCategoria);
    } else {
      idsCategorias.delete(idCategoria);
    }

    this.draftChangeEvent.emit({
      idsCategorias: [...idsCategorias],
    });
  }

  /**
   * Actualiza la referencia.
   */
  onReferenciaInput(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.draftChangeEvent.emit({
      referencia: inputElement.value,
    });
  }

  /**
   * Activa o desactiva la preparación del artículo para venta online.
   */
  onVentaOnlineChange(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.draftChangeEvent.emit({
      ventaOnline: inputElement.checked,
    });
  }

  /**
   * Actualiza uno de los campos enteros de stock.
   */
  onIntegerChange(event: Event, field: ArticleIntegerField, nonNegative: boolean): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const rawValue: number = inputElement.valueAsNumber;

    if (!Number.isFinite(rawValue)) {
      return;
    }

    const value: number = nonNegative ? Math.max(0, Math.trunc(rawValue)) : Math.trunc(rawValue);

    switch (field) {
      case 'stock':
        this.draftChangeEvent.emit({
          stock: value,
        });
        return;

      case 'stockMin':
        this.draftChangeEvent.emit({
          stockMin: value,
        });
        return;

      case 'stockMax':
        this.draftChangeEvent.emit({
          stockMax: value,
        });
        return;

      case 'loteOptimo':
        this.draftChangeEvent.emit({
          loteOptimo: value,
        });
        return;
    }
  }

  /**
   * Indica si una categoría pertenece al artículo.
   */
  isCategoriaSelected(categoria: Categoria): boolean {
    return categoria.id !== null && this.tab().draft.idsCategorias.includes(categoria.id);
  }

  /**
   * Obtiene la sangría visual de una categoría jerárquica.
   */
  getCategoriaIndent(categoria: Categoria): number {
    return Math.max(0, categoria.profundidad - 1) * 18;
  }

  /**
   * Reintenta la carga de datos maestros.
   */
  retry(): void {
    void this.loadMasterData();
  }

  /**
   * Carga configuración y datos maestros de General en paralelo.
   */
  private async loadMasterData(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      await Promise.all([
        this.appDataService.load(),
        this.marcasService.load(),
        this.proveedoresService.load(),
        this.categoriasService.load(),
      ]);
    } catch (error: unknown) {
      this.loadError.set(
        getErrorMessage(error, 'No se han podido cargar los datos generales del artículo.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Construye los pares fiscales disponibles para la instalación
   * y conserva como opción una fiscalidad histórica que ya no
   * figure en la configuración actual.
   */
  private buildFiscalOptions(): readonly ArticleFiscalOption[] {
    const appData = this.appDataService.appData();
    const options: ArticleFiscalOption[] = [];

    if (appData !== null) {
      for (let index: number = 0; index < appData.ivaList.length; index++) {
        const ivaBps: number | null = numberToScaledInteger(appData.ivaList[index], 2);
        const reValue: number | undefined = appData.tipoIva === 're' ? appData.reList[index] : 0;
        const reBps: number | null =
          reValue === undefined ? null : numberToScaledInteger(reValue, 2);

        if (ivaBps === null || reBps === null || ivaBps < 0 || reBps < 0) {
          continue;
        }

        const option: ArticleFiscalOption = {
          key: this.createFiscalKey(ivaBps, reBps),
          ivaBps,
          reBps,
        };

        if (!options.some((current: ArticleFiscalOption): boolean => current.key === option.key)) {
          options.push(option);
        }
      }
    }

    const currentIva: number | null = this.tab().draft.ivaBps;
    const currentRe: number | null = this.tab().draft.reBps;

    if (currentIva !== null && currentRe !== null) {
      const key: string = this.createFiscalKey(currentIva, currentRe);

      if (!options.some((option: ArticleFiscalOption): boolean => option.key === key)) {
        options.push({
          key,
          ivaBps: currentIva,
          reBps: currentRe,
        });
      }
    }

    return options;
  }

  /**
   * Construye las sugerencias de margen configuradas.
   */
  private buildMarginOptions(): readonly number[] {
    const appData = this.appDataService.appData();

    if (appData === null) {
      return [];
    }

    const result: number[] = [];

    for (const margin of appData.marginList) {
      const scaledMargin: number | null = numberToScaledInteger(margin, 6);

      if (scaledMargin === null || scaledMargin >= 100_000_000 || result.includes(scaledMargin)) {
        continue;
      }

      result.push(scaledMargin);
    }

    return result.sort((left: number, right: number): number => left - right);
  }

  /**
   * Genera la identidad estable de un par IVA/RE.
   */
  private createFiscalKey(ivaBps: number, reBps: number): string {
    return `${ivaBps}:${reBps}`;
  }

  /**
   * Obtiene la identidad fiscal actual del draft.
   */
  private getCurrentFiscalKey(): string {
    const ivaBps: number | null = this.tab().draft.ivaBps;
    const reBps: number | null = this.tab().draft.reBps;

    if (ivaBps === null || reBps === null) {
      return '';
    }

    return this.createFiscalKey(ivaBps, reBps);
  }

  /**
   * Restaura visualmente un selector fiscal cuando
   * el nuevo valor no ha podido aplicarse.
   */
  private restoreFiscalSelection(selectElement: HTMLSelectElement): void {
    selectElement.value = this.getCurrentFiscalKey();
  }

  /**
   * Calcula el patch correspondiente a una edición monetaria.
   */
  private calculatePricePatch(field: ArticlePriceField, value: number): ArticuloDraftPatch {
    switch (field) {
      case 'precioAlbaran':
        return ArticuloPriceCalculator.actualizarPrecioAlbaran(this.tab().draft, value);

      case 'puc':
        return ArticuloPriceCalculator.actualizarPuc(this.tab().draft, value);

      case 'margen':
        return ArticuloPriceCalculator.actualizarMargen(this.tab().draft, value);

      case 'pvp':
        return ArticuloPriceCalculator.actualizarPvp(this.tab().draft, value);

      case 'margenDescuento':
        return ArticuloPriceCalculator.actualizarMargenDescuento(this.tab().draft, value);

      case 'pvpDescuento':
        return ArticuloPriceCalculator.actualizarPvpDescuento(this.tab().draft, value);
    }
  }

  /**
   * Obtiene la precisión de almacenamiento de un campo.
   */
  private getPriceScaleDigits(field: ArticlePriceField): number {
    return field === 'pvp' || field === 'pvpDescuento' ? 2 : 6;
  }

  /**
   * Obtiene el nombre legible de un campo monetario.
   */
  private getPriceFieldLabel(field: ArticlePriceField): string {
    switch (field) {
      case 'precioAlbaran':
        return 'Precio albarán';

      case 'puc':
        return 'PUC';

      case 'margen':
        return 'Margen';

      case 'pvp':
        return 'PVP';

      case 'margenDescuento':
        return 'Margen con descuento';

      case 'pvpDescuento':
        return 'PVP con descuento';
    }
  }

  /**
   * Restaura visualmente el valor persistente del campo
   * cuando una entrada no ha podido aplicarse.
   */
  private restorePriceInput(inputElement: HTMLInputElement, field: ArticlePriceField): void {
    switch (field) {
      case 'precioAlbaran':
        inputElement.value = this.formatMicros(this.tab().draft.precioAlbaranMicros);
        return;

      case 'puc':
        inputElement.value = this.formatMicros(this.tab().draft.pucMicros);
        return;

      case 'margen':
        inputElement.value = this.formatMargin(this.tab().draft.margenMicroporcentaje);
        return;

      case 'pvp':
        inputElement.value = this.formatCents(this.tab().draft.pvpCents);
        return;

      case 'margenDescuento':
        inputElement.value = this.formatMargin(
          this.tab().draft.margenDescuentoMicroporcentaje ?? 0,
        );
        return;

      case 'pvpDescuento':
        inputElement.value = this.formatCents(this.tab().draft.pvpDescuentoCents ?? 0);
        return;
    }
  }

  /**
   * Restaura el descuento efectivo de la ficha.
   */
  private restoreDiscountInput(inputElement: HTMLInputElement): void {
    inputElement.value = this.formatMargin(this.getDescuentoMicroporcentaje());
  }

  /**
   * Convierte el valor de un select a identificador persistido.
   */
  private parseSelectedId(value: string): number | null {
    if (value === '') {
      return null;
    }

    const id: number = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }
}
