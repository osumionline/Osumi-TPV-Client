import {
  Component,
  computed,
  inject,
  signal,
  viewChild,
  type OnDestroy,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox, type MatCheckboxChange } from '@angular/material/checkbox';
import { MatOption } from '@angular/material/core';
import { MatFormField } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatSelect, type MatSelectChange } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import HeaderComponent from '@app/components/header/header.component';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
import type { PedidoTipo } from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type PurchaseOrderLineBarcodeChange from '@model/compras/pedidos/purchase-order-line-barcode-change.interface';
import type PurchaseOrderLineEconomicChange from '@model/compras/pedidos/purchase-order-line-economic-change.interface';
import type PurchaseOrderLineMove from '@model/compras/pedidos/purchase-order-line-move.interface';
import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import PurchaseOrderLineTaxChange from '@model/compras/pedidos/purchase-order-line-tax-change.interface';
import type PurchaseOrderLineUnitsChange from '@model/compras/pedidos/purchase-order-line-units-change.interface';
import type PurchaseOrderTaxPair from '@model/compras/pedidos/purchase-order-tax-pair.interface';
import Proveedor from '@model/proveedores/proveedor.model';
import ProviderQuickCreateComponent from '@modules/articulos/components/provider-quick-create/provider-quick-create.component';
import PurchaseOrderLinesComponent from '@modules/compras/pedidos/components/purchase-order-lines/purchase-order-lines.component';
import {
  addPurchaseOrderArticles,
  addPurchaseOrderProviderOption,
  buildPurchaseOrderPaymentOptions,
  buildPurchaseOrderProviderOptions,
  buildPurchaseOrderSaveCommand,
  buildPurchaseOrderTaxPairs,
  createExistingPurchaseOrderFormState,
  createExistingPurchaseOrderLineState,
  createNewPurchaseOrderFormState,
  getPurchaseOrderPaymentKey,
  movePurchaseOrderLine,
  normalizePurchaseOrderColumns,
  parsePurchaseOrderRouteId,
  parsePurchaseOrderTipo,
  PURCHASE_ORDER_COLUMN_OPTIONS,
  recalculatePurchaseOrderLinesForRecargo,
  removePurchaseOrderLine,
  updatePurchaseOrderLineBarcode,
  updatePurchaseOrderLineEconomic,
  updatePurchaseOrderLineTax,
  updatePurchaseOrderLineUnits,
  type AddPurchaseOrderArticlesResult,
  type PurchaseOrderColumnOption,
  type PurchaseOrderFormState,
  type PurchaseOrderPaymentOption,
  type PurchaseOrderProviderOption,
  type PurchaseOrderTextField,
} from '@modules/compras/pedidos/pages/purchase-order/purchase-order.component.private';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import ComprasService from '@services/compras.service';
import MarcasService from '@services/marcas.service';
import ProveedoresService from '@services/proveedores.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Muestra y edita en memoria la cabecera de un Pedido.
 */
@Component({
  selector: 'otpv-purchase-order',
  templateUrl: './purchase-order.component.html',
  styleUrl: './purchase-order.component.scss',
  imports: [
    HeaderComponent,
    ProviderQuickCreateComponent,
    PurchaseOrderLinesComponent,
    MatButton,
    MatCheckbox,
    MatFormField,
    MatIcon,
    MatIconButton,
    MatOption,
    MatSelect,
    MatTooltip,
    RouterLink,
  ],
})
export default class PurchaseOrderComponent implements OnInit, OnDestroy {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
  private readonly router: Router = inject(Router);
  private readonly comprasService: ComprasService = inject(ComprasService);
  private readonly proveedoresService: ProveedoresService = inject(ProveedoresService);
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);
  readonly marcasService: MarcasService = inject(MarcasService);

  private readonly purchaseOrderLines: Signal<PurchaseOrderLinesComponent | undefined> = viewChild(
    PurchaseOrderLinesComponent,
  );

  readonly formState: WritableSignal<PurchaseOrderFormState | null> =
    signal<PurchaseOrderFormState | null>(null);
  readonly providerOptions: WritableSignal<readonly PurchaseOrderProviderOption[]> = signal<
    readonly PurchaseOrderProviderOption[]
  >([]);
  readonly paymentOptions: WritableSignal<readonly PurchaseOrderPaymentOption[]> = signal<
    readonly PurchaseOrderPaymentOption[]
  >([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly saving: WritableSignal<boolean> = signal<boolean>(false);
  readonly deleting: WritableSignal<boolean> = signal<boolean>(false);
  readonly proveedorModalOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly preparingProveedorModal: WritableSignal<boolean> = signal<boolean>(false);
  readonly creatingProveedor: WritableSignal<boolean> = signal<boolean>(false);
  readonly proveedorCreateError: WritableSignal<string | null> = signal<string | null>(null);

  readonly processing: Signal<boolean> = computed((): boolean => this.saving() || this.deleting());
  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);

  private saveFeedbackTimeoutId: number | null = null;

  private showSaveFeedbackAfterLoad: boolean =
    this.router.currentNavigation()?.extras.state?.['purchaseOrderSaveSuccessful'] === true;
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);
  readonly lines: WritableSignal<readonly PurchaseOrderLineState[]> = signal<
    readonly PurchaseOrderLineState[]
  >([]);
  readonly taxPairs: WritableSignal<readonly PurchaseOrderTaxPair[]> = signal<
    readonly PurchaseOrderTaxPair[]
  >([]);

  readonly columnOptions: readonly PurchaseOrderColumnOption[] = PURCHASE_ORDER_COLUMN_OPTIONS;

  readonly appName: Signal<string> = computed((): string => {
    const appData = this.appDataService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  readonly title: Signal<string> = computed((): string => {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state?.id !== null && state?.id !== undefined) {
      return `Pedido ${state.id}`;
    }

    return 'Nuevo pedido';
  });

  readonly selectedPaymentKey: Signal<string> = computed((): string => {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null) {
      return '';
    }

    return getPurchaseOrderPaymentKey(state, this.paymentOptions());
  });

  readonly numeroPlaceholder: Signal<string> = computed((): string => {
    const tipo: PedidoTipo | undefined = this.formState()?.tipo;

    switch (tipo) {
      case 'factura':
        return 'Número factura';

      case 'abono':
        return 'Número abono';

      default:
        return 'Número albarán';
    }
  });

  /**
   * Carga la configuración, las opciones y la cabecera solicitada.
   */
  ngOnInit(): void {
    void this.loadPage();
  }

  /**
   * Libera el temporizador pendiente de confirmación de guardado.
   */
  ngOnDestroy(): void {
    this.clearSaveFeedback();
  }

  /**
   * Reintenta una carga fallida de la ficha.
   */
  retryLoad(): void {
    void this.loadPage();
  }

  /**
   * Inicia el guardado de la cabecera actualmente editada.
   */
  onSave(): void {
    void this.saveOrder();
  }

  /**
   * Solicita confirmación antes de eliminar un pedido pendiente.
   */
  onDelete(): void {
    if (this.processing()) {
      return;
    }

    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.id === null || state.recepcionado) {
      return;
    }

    const idPedido: number = state.id;

    this.dialog
      .confirm({
        title: 'Eliminar pedido',
        content:
          '¿Estás seguro de querer eliminar este pedido? ' + 'Esta acción no se puede deshacer.',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        void this.deleteOrder(idPedido);
      });
  }

  /**
   * Prepara y abre el formulario de creación rápida de Proveedor.
   */
  openProveedorModal(): void {
    if (this.processing() || this.preparingProveedorModal() || this.creatingProveedor()) {
      return;
    }

    void this.prepareProveedorModal();
  }

  /**
   * Cierra el formulario de Proveedor cuando no existe
   * una creación en curso.
   */
  closeProveedorModal(): void {
    if (this.creatingProveedor()) {
      return;
    }

    this.proveedorModalOpen.set(false);
    this.proveedorCreateError.set(null);
  }

  /**
   * Crea el proveedor y lo selecciona inmediatamente
   * en la cabecera del Pedido.
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

      const idProveedor: number = proveedor.id;

      this.providerOptions.update(
        (options: readonly PurchaseOrderProviderOption[]): readonly PurchaseOrderProviderOption[] =>
          addPurchaseOrderProviderOption(options, idProveedor, proveedor.nombre),
      );

      this.updateState({
        idProveedor,
      });

      this.proveedorModalOpen.set(false);
    } catch (error: unknown) {
      this.proveedorCreateError.set(getErrorMessage(error, 'No se ha podido crear el proveedor.'));
    } finally {
      this.creatingProveedor.set(false);
    }
  }

  /**
   * Incorpora al estado editable los artículos elegidos
   * desde el localizador o el buscador.
   */
  onArticlesSelected(articulos: readonly PedidoArticuloInterface[]): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing() || articulos.length === 0) {
      return;
    }

    const currentLines: readonly PurchaseOrderLineState[] = this.lines();

    const result: AddPurchaseOrderArticlesResult = addPurchaseOrderArticles(
      currentLines,
      articulos,
    );

    if (result.lines !== currentLines) {
      this.clearSaveFeedback();
      this.lines.set(result.lines);
    }

    if (result.duplicateLineKey !== null) {
      this.purchaseOrderLines()?.focusUnits(result.duplicateLineKey);
    }
  }

  /**
   * Aplica al estado editable un cambio de unidades
   * realizado desde la tabla del Pedido.
   */
  onLineUnitsChange(change: PurchaseOrderLineUnitsChange): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing()) {
      return;
    }

    const currentLines: readonly PurchaseOrderLineState[] = this.lines();

    const nextLines: readonly PurchaseOrderLineState[] = updatePurchaseOrderLineUnits(
      currentLines,
      change,
    );

    if (nextLines === currentLines) {
      return;
    }

    this.clearSaveFeedback();
    this.lines.set(nextLines);
  }

  /**
   * Aplica un cambio de posición solicitado desde
   * la tabla editable del Pedido.
   */
  onLineMove(move: PurchaseOrderLineMove): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing()) {
      return;
    }

    const currentLines: readonly PurchaseOrderLineState[] = this.lines();

    const nextLines: readonly PurchaseOrderLineState[] = movePurchaseOrderLine(currentLines, move);

    if (nextLines === currentLines) {
      return;
    }

    this.clearSaveFeedback();
    this.lines.set(nextLines);
  }

  /**
   * Solicita confirmación antes de eliminar una línea
   * del Pedido pendiente.
   */
  onLineDeleteRequested(lineKey: string): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing()) {
      return;
    }

    const line: PurchaseOrderLineState | undefined = this.lines().find(
      (currentLine: PurchaseOrderLineState): boolean => currentLine.key === lineKey,
    );

    if (line === undefined) {
      return;
    }

    this.dialog
      .confirm({
        title: 'Eliminar línea',
        content: `¿Quieres eliminar "${line.nombreArticulo}" ` + 'del pedido?',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        this.removeLine(lineKey);
      });
  }

  /**
   * Aplica al estado editable un cambio del código
   * de barras adicional de una línea.
   */
  onLineBarcodeChange(change: PurchaseOrderLineBarcodeChange): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing()) {
      return;
    }

    const currentLines: readonly PurchaseOrderLineState[] = this.lines();

    const nextLines: readonly PurchaseOrderLineState[] = updatePurchaseOrderLineBarcode(
      currentLines,
      change,
    );

    if (nextLines === currentLines) {
      return;
    }

    this.clearSaveFeedback();
    this.lines.set(nextLines);
  }

  /**
   * Aplica un cambio económico realizado desde una
   * línea editable y recalcula sus valores derivados.
   */
  onLineEconomicChange(change: PurchaseOrderLineEconomicChange): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing()) {
      return;
    }

    const currentLines: readonly PurchaseOrderLineState[] = this.lines();

    try {
      const nextLines: readonly PurchaseOrderLineState[] = updatePurchaseOrderLineEconomic(
        currentLines,
        change,
        state.recargoEquivalencia,
      );

      if (nextLines === currentLines) {
        return;
      }

      this.clearSaveFeedback();
      this.lines.set(nextLines);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido actualizar la línea del pedido.'),
        })
        .subscribe();
    }
  }

  /**
   * Elimina una línea previamente confirmada.
   */
  private removeLine(lineKey: string): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing()) {
      return;
    }

    const currentLines: readonly PurchaseOrderLineState[] = this.lines();

    const nextLines: readonly PurchaseOrderLineState[] = removePurchaseOrderLine(
      currentLines,
      lineKey,
    );

    if (nextLines === currentLines) {
      return;
    }

    this.clearSaveFeedback();
    this.lines.set(nextLines);
  }

  /**
   * Elimina el pedido confirmado y vuelve al listado de Compras.
   */
  private async deleteOrder(idPedido: number): Promise<void> {
    if (this.processing()) {
      return;
    }

    this.clearSaveFeedback();
    this.deleting.set(true);

    try {
      await this.comprasService.deletePedido(idPedido);

      await this.router.navigate(['/compras'], {
        replaceUrl: true,
      });
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido eliminar el pedido.'),
        })
        .subscribe();
    } finally {
      this.deleting.set(false);
    }
  }

  /**
   * Actualiza el proveedor seleccionado.
   */
  onProviderChange(event: Event): void {
    const select: HTMLSelectElement = event.target as HTMLSelectElement;
    const idProveedor: number | null = select.value === '' ? null : Number(select.value);

    this.updateState({
      idProveedor:
        idProveedor !== null && Number.isSafeInteger(idProveedor) && idProveedor > 0
          ? idProveedor
          : null,
    });
  }

  /**
   * Actualiza la forma de pago elegida.
   */
  onPaymentChange(event: Event): void {
    const select: HTMLSelectElement = event.target as HTMLSelectElement;
    const option: PurchaseOrderPaymentOption | undefined = this.paymentOptions().find(
      (payment: PurchaseOrderPaymentOption): boolean => payment.key === select.value,
    );

    this.updateState({
      idTipoPago: option?.idTipoPago ?? null,
      formaPago: option?.formaPago ?? null,
    });
  }

  /**
   * Actualiza el tipo documental.
   */
  onTipoChange(event: Event): void {
    const select: HTMLSelectElement = event.target as HTMLSelectElement;

    this.updateState({
      tipo: parsePurchaseOrderTipo(select.value),
    });
  }

  /**
   * Actualiza uno de los campos textuales de la cabecera.
   */
  onTextInput(field: PurchaseOrderTextField, event: Event): void {
    const control: HTMLInputElement | HTMLTextAreaElement = event.target as
      HTMLInputElement | HTMLTextAreaElement;

    this.updateState({
      [field]: control.value,
    });
  }

  /**
   * Actualiza el uso global de R.E. y recalcula
   * inmediatamente todas las líneas editables.
   */
  onRecargoEquivalenciaChange(event: MatCheckboxChange): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing()) {
      return;
    }

    const currentLines: readonly PurchaseOrderLineState[] = this.lines();

    try {
      const nextLines: readonly PurchaseOrderLineState[] = recalculatePurchaseOrderLinesForRecargo(
        currentLines,
        this.taxPairs(),
        event.checked,
      );

      if (nextLines !== currentLines) {
        this.lines.set(nextLines);
      }

      this.updateState({
        recargoEquivalencia: event.checked,
      });
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido actualizar el Recargo de Equivalencia.'),
        })
        .subscribe();
    }
  }

  /**
   * Actualiza el indicador de operación UE.
   */
  onEuropeoChange(event: MatCheckboxChange): void {
    this.updateState({
      europeo: event.checked,
    });
  }

  /**
   * Actualiza las columnas opcionales visibles.
   */
  onColumnsChange(event: MatSelectChange): void {
    this.updateState({
      columnasVisibles: normalizePurchaseOrderColumns(event.value),
    });
  }

  /**
   * Aplica un cambio de IVA o RE y mantiene
   * sincronizada su pareja fiscal.
   */
  onLineTaxChange(change: PurchaseOrderLineTaxChange): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado || this.processing()) {
      return;
    }

    const currentLines: readonly PurchaseOrderLineState[] = this.lines();

    try {
      const nextLines: readonly PurchaseOrderLineState[] = updatePurchaseOrderLineTax(
        currentLines,
        change,
        this.taxPairs(),
        state.recargoEquivalencia,
      );

      if (nextLines === currentLines) {
        return;
      }

      this.clearSaveFeedback();
      this.lines.set(nextLines);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido actualizar la fiscalidad de la línea.'),
        })
        .subscribe();
    }
  }

  /**
   * Carga las marcas necesarias para el formulario rápido
   * y abre el modal cuando la carga finaliza correctamente.
   */
  private async prepareProveedorModal(): Promise<void> {
    this.preparingProveedorModal.set(true);
    this.proveedorCreateError.set(null);

    try {
      await this.marcasService.load();

      if (!this.processing()) {
        this.proveedorModalOpen.set(true);
      }
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se han podido cargar las marcas disponibles.'),
        })
        .subscribe();
    } finally {
      this.preparingProveedorModal.set(false);
    }
  }

  /**
   * Persiste el Pedido completo, relee su estado
   * canónico y actualiza la URL cuando es nuevo.
   */
  private async saveOrder(): Promise<void> {
    if (this.processing()) {
      return;
    }

    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null) {
      return;
    }

    this.clearSaveFeedback();
    this.saving.set(true);

    try {
      const command: PedidoSaveCommand = buildPurchaseOrderSaveCommand(state, this.lines());

      const wasNew: boolean = command.id === null;

      const idPedido: number = await this.comprasService.savePedido(command);

      const [pedido, savedLines]: [
        PedidoCabeceraInterface | null,
        readonly PedidoLineaInterface[],
      ] = await Promise.all([
        this.comprasService.getPedido(idPedido),
        this.comprasService.getPedidoLineas(idPedido),
      ]);

      if (pedido === null) {
        throw new Error('El pedido se ha guardado pero no se ha podido volver a cargar.');
      }

      this.formState.set(createExistingPurchaseOrderFormState(pedido));

      this.lines.set(
        savedLines.map((line: PedidoLineaInterface): PurchaseOrderLineState =>
          createExistingPurchaseOrderLineState(line),
        ),
      );
      this.showSaveFeedback();

      if (wasNew) {
        await this.router.navigate(['/compras/pedido', idPedido], {
          replaceUrl: true,
          state: {
            purchaseOrderSaveSuccessful: true,
          },
        });
      }
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido guardar el pedido.'),
        })
        .subscribe();
    } finally {
      this.saving.set(false);
    }
  }

  /**
   * Carga en paralelo la configuración general, las opciones
   * de formulario y, cuando procede, el pedido persistido.
   */
  private async loadPage(): Promise<void> {
    this.clearSaveFeedback();
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const idPedido: number | null = parsePurchaseOrderRouteId(
        this.route.snapshot.paramMap.get('idPedido'),
      );

      const [appData, options, pedido, lines]: [
        Awaited<ReturnType<AppDataService['load']>>,
        PedidoFormOptionsInterface,
        PedidoCabeceraInterface | null,
        readonly PedidoLineaInterface[],
      ] = await Promise.all([
        this.appDataService.load(),
        this.comprasService.getPedidoFormOptions(),
        idPedido === null ? Promise.resolve(null) : this.comprasService.getPedido(idPedido),
        idPedido === null
          ? Promise.resolve<readonly PedidoLineaInterface[]>([])
          : this.comprasService.getPedidoLineas(idPedido),
      ]);

      if (idPedido !== null && pedido === null) {
        throw new Error('El pedido indicado no existe.');
      }

      this.taxPairs.set(buildPurchaseOrderTaxPairs(appData?.ivaList ?? [], appData?.reList ?? []));

      this.lines.set(
        lines.map((line: PedidoLineaInterface): PurchaseOrderLineState =>
          createExistingPurchaseOrderLineState(line),
        ),
      );
      this.providerOptions.set(buildPurchaseOrderProviderOptions(options.proveedores, pedido));
      this.paymentOptions.set(buildPurchaseOrderPaymentOptions(options.tiposPago, pedido));

      this.formState.set(
        pedido === null
          ? createNewPurchaseOrderFormState(appData?.tipoIva === 're')
          : createExistingPurchaseOrderFormState(pedido),
      );
      if (this.showSaveFeedbackAfterLoad) {
        this.showSaveFeedbackAfterLoad = false;
        this.showSaveFeedback();
      }
    } catch (error: unknown) {
      const message: string = getErrorMessage(error, 'No se ha podido cargar la ficha de Pedido.');

      this.formState.set(null);
      this.lines.set([]);
      this.providerOptions.set([]);
      this.paymentOptions.set([]);
      this.taxPairs.set([]);
      this.loadError.set(message);

      this.dialog
        .alert({
          title: 'Error',
          content: message,
        })
        .subscribe();
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Muestra temporalmente la confirmación de que
   * el pedido se ha guardado correctamente.
   */
  private showSaveFeedback(): void {
    this.clearSaveFeedback();
    this.saveSuccessful.set(true);

    this.saveFeedbackTimeoutId = window.setTimeout((): void => {
      this.saveSuccessful.set(false);
      this.saveFeedbackTimeoutId = null;
    }, 4_000);
  }

  /**
   * Oculta la confirmación de guardado activa y cancela
   * su temporizador cuando todavía está pendiente.
   */
  private clearSaveFeedback(): void {
    if (this.saveFeedbackTimeoutId !== null) {
      window.clearTimeout(this.saveFeedbackTimeoutId);
      this.saveFeedbackTimeoutId = null;
    }

    this.saveSuccessful.set(false);
  }

  /**
   * Aplica un cambio parcial al estado editable actual.
   */
  private updateState(patch: Partial<PurchaseOrderFormState>): void {
    this.clearSaveFeedback();

    this.formState.update((state: PurchaseOrderFormState | null): PurchaseOrderFormState | null =>
      state === null
        ? null
        : {
            ...state,
            ...patch,
          },
    );
  }
}
