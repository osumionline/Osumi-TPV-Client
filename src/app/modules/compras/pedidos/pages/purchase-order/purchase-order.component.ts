import {
  Component,
  computed,
  effect,
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
import type { PedidoArchivoInterface } from '@desktop-contracts/compras/pedidos/pedido-archivo.interface';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
import type { PedidoTipo } from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type PurchaseOrderArticleFlowState from '@model/compras/pedidos/purchase-order-article-flow.interface';
import {
  getPurchaseOrderReturnedArticleId,
  parsePurchaseOrderArticleFlowState,
  PURCHASE_ORDER_ARTICLE_FLOW_STATE_KEY,
} from '@model/compras/pedidos/purchase-order-article-flow.utils';
import type PurchaseOrderLineBarcodeChange from '@model/compras/pedidos/purchase-order-line-barcode-change.interface';
import type PurchaseOrderLineEconomicChange from '@model/compras/pedidos/purchase-order-line-economic-change.interface';
import type PurchaseOrderLineMove from '@model/compras/pedidos/purchase-order-line-move.interface';
import type PurchaseOrderLineState from '@model/compras/pedidos/purchase-order-line-state.interface';
import PurchaseOrderLineTaxChange from '@model/compras/pedidos/purchase-order-line-tax-change.interface';
import type PurchaseOrderLineUnitsChange from '@model/compras/pedidos/purchase-order-line-units-change.interface';
import type PurchaseOrderTaxPair from '@model/compras/pedidos/purchase-order-tax-pair.interface';
import PurchaseOrderTotalsCalculator from '@model/compras/pedidos/purchase-order-totals-calculator';
import type { PurchaseOrderTotals } from '@model/compras/pedidos/purchase-order-totals.interface';
import type PendingChangesAware from '@model/navigation/pending-changes-aware.interface';
import Proveedor from '@model/proveedores/proveedor.model';
import ProviderQuickCreateComponent from '@modules/articulos/components/provider-quick-create/provider-quick-create.component';
import PurchaseOrderFilesComponent from '@modules/compras/pedidos/components/purchase-order-files/purchase-order-files.component';
import PurchaseOrderLinesComponent from '@modules/compras/pedidos/components/purchase-order-lines/purchase-order-lines.component';
import PurchaseOrderTotalsComponent from '@modules/compras/pedidos/components/purchase-order-totals/purchase-order-totals.component';
import {
  addPurchaseOrderArticles,
  addPurchaseOrderProviderOption,
  buildPurchaseOrderDirtyFingerprint,
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
import type { Observable } from 'rxjs';

/**
 * Muestra y gestiona la ficha completa de un Pedido.
 */
@Component({
  selector: 'otpv-purchase-order',
  templateUrl: './purchase-order.component.html',
  styleUrl: './purchase-order.component.scss',
  imports: [
    HeaderComponent,
    ProviderQuickCreateComponent,
    PurchaseOrderLinesComponent,
    PurchaseOrderTotalsComponent,
    PurchaseOrderFilesComponent,
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
  host: {
    '(window:beforeunload)': 'onBeforeUnload($event)',
  },
})
export default class PurchaseOrderComponent implements OnInit, OnDestroy, PendingChangesAware {
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

  private readonly purchaseOrderArticleFlow: PurchaseOrderArticleFlowState | null =
    parsePurchaseOrderArticleFlowState(
      this.router.currentNavigation()?.extras.state?.[PURCHASE_ORDER_ARTICLE_FLOW_STATE_KEY],
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

  readonly processing: Signal<boolean> = computed(
    (): boolean =>
      this.saving() ||
      this.deleting() ||
      this.attachingPdf() ||
      this.openingPdfId() !== null ||
      this.deletingPdfId() !== null,
  );
  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);

  private saveFeedbackTimeoutId: number | null = null;

  private showSaveFeedbackAfterLoad: boolean =
    this.router.currentNavigation()?.extras.state?.['purchaseOrderSaveSuccessful'] === true;
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);
  readonly lines: WritableSignal<readonly PurchaseOrderLineState[]> = signal<
    readonly PurchaseOrderLineState[]
  >([]);
  readonly files: WritableSignal<readonly PedidoArchivoInterface[]> = signal<
    readonly PedidoArchivoInterface[]
  >([]);

  readonly attachingPdf: WritableSignal<boolean> = signal<boolean>(false);
  readonly openingPdfId: WritableSignal<number | null> = signal<number | null>(null);
  readonly deletingPdfId: WritableSignal<number | null> = signal<number | null>(null);
  private readonly pendingUnitsFocusLineKey: WritableSignal<string | null> = signal<string | null>(
    null,
  );
  private readonly cleanFingerprint: WritableSignal<string | null> = signal<string | null>(null);

  readonly canAttachPdf: Signal<boolean> = computed((): boolean => {
    const state: PurchaseOrderFormState | null = this.formState();

    return state !== null && state.id !== null && !this.processing() && !this.dirty();
  });
  readonly dirty: Signal<boolean> = computed((): boolean => {
    const state: PurchaseOrderFormState | null = this.formState();

    const cleanFingerprint: string | null = this.cleanFingerprint();

    if (state === null || cleanFingerprint === null) {
      return false;
    }

    return buildPurchaseOrderDirtyFingerprint(state, this.lines()) !== cleanFingerprint;
  });
  readonly taxPairs: WritableSignal<readonly PurchaseOrderTaxPair[]> = signal<
    readonly PurchaseOrderTaxPair[]
  >([]);
  readonly totals: Signal<PurchaseOrderTotals | null> = computed((): PurchaseOrderTotals | null => {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null) {
      return null;
    }

    return PurchaseOrderTotalsCalculator.calcular(
      this.lines(),
      state.portesMicros,
      state.descuentoGlobalBps,
      state.recargoEquivalencia,
    );
  });

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

  readonly canCreateArticleFromOrder: Signal<boolean> = computed((): boolean => {
    const state: PurchaseOrderFormState | null = this.formState();

    return (
      state !== null &&
      state.id !== null &&
      !state.recepcionado &&
      !this.processing() &&
      !this.dirty()
    );
  });

  constructor() {
    effect((): void => {
      const lineKey: string | null = this.pendingUnitsFocusLineKey();

      const linesComponent: PurchaseOrderLinesComponent | undefined = this.purchaseOrderLines();

      if (lineKey === null || linesComponent === undefined) {
        return;
      }

      linesComponent.focusUnits(lineKey);
      this.pendingUnitsFocusLineKey.set(null);
    });
  }

  /**
   * Abre un PDF asociado al Pedido actual.
   */
  onOpenPdf(idPedidoArchivo: number): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.id === null || this.processing()) {
      return;
    }

    void this.openPdf(state.id, idPedidoArchivo);
  }

  /**
   * Solicita confirmación antes de desvincular
   * definitivamente un PDF del Pedido.
   */
  onDeletePdfRequested(file: PedidoArchivoInterface): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.id === null || this.processing()) {
      return;
    }

    const idPedido: number = state.id;

    this.dialog
      .confirm({
        title: 'Eliminar PDF',
        content:
          `¿Quieres eliminar "${file.nombre}" del pedido? ` + 'Esta acción no se puede deshacer.',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        void this.deletePdf(idPedido, file.id);
      });
  }

  /**
   * Abre el selector nativo y adjunta un PDF
   * inmediatamente al Pedido persistido.
   */
  onAttachPdf(): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.id === null || !this.canAttachPdf()) {
      return;
    }

    void this.attachPdf(state.id);
  }

  /**
   * Abre Artículos para crear una referencia nueva
   * destinada al Pedido persistido actual.
   */
  onCreateArticleRequested(): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (
      state === null ||
      state.id === null ||
      state.recepcionado ||
      this.processing() ||
      this.dirty()
    ) {
      return;
    }

    const flowState: PurchaseOrderArticleFlowState = {
      idPedido: state.id,
      idArticulo: null,
    };

    void this.router.navigate(['/articulos'], {
      state: {
        [PURCHASE_ORDER_ARTICLE_FLOW_STATE_KEY]: flowState,
      },
    });
  }

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
   * Decide si se puede abandonar la ficha actual
   * cuando existen cambios todavía no guardados.
   */
  canDeactivate(): boolean | Observable<boolean> {
    if (!this.dirty()) {
      return true;
    }

    if (this.processing()) {
      return false;
    }

    return this.dialog.confirm({
      title: 'Cambios sin guardar',
      content:
        'Hay cambios en el pedido que todavía no se han guardado. ' +
        '¿Quieres salir y descartarlos?',
    });
  }

  /**
   * Solicita confirmación nativa al cerrar o recargar
   * la ventana mientras existen cambios pendientes.
   */
  onBeforeUnload(event: BeforeUnloadEvent): void {
    if (!this.dirty()) {
      return;
    }

    event.preventDefault();
    event.returnValue = '';
  }

  /**
   * Reintenta una carga fallida de la ficha.
   */
  retryLoad(): void {
    void this.loadPage();
  }

  /**
   * Inicia el guardado del Pedido actualmente editado.
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
   * Actualiza los portes económicos de un Pedido pendiente.
   */
  onPortesChange(portesMicros: number): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (
      state === null ||
      state.recepcionado ||
      this.processing() ||
      !Number.isSafeInteger(portesMicros) ||
      portesMicros < 0 ||
      portesMicros === state.portesMicros
    ) {
      return;
    }

    this.updateState({
      portesMicros,
    });
  }

  /**
   * Actualiza el descuento global de un Pedido pendiente.
   */
  onDescuentoGlobalChange(descuentoGlobalBps: number): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (
      state === null ||
      state.recepcionado ||
      this.processing() ||
      !Number.isSafeInteger(descuentoGlobalBps) ||
      descuentoGlobalBps < 0 ||
      descuentoGlobalBps > 10_000 ||
      descuentoGlobalBps === state.descuentoGlobalBps
    ) {
      return;
    }

    this.updateState({
      descuentoGlobalBps,
    });
  }

  /**
   * Abre físicamente un PDF mediante Electron.
   */
  private async openPdf(idPedido: number, idPedidoArchivo: number): Promise<void> {
    if (this.processing()) {
      return;
    }

    this.openingPdfId.set(idPedidoArchivo);

    try {
      await this.comprasService.openPedidoPdf(idPedido, idPedidoArchivo);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido abrir el PDF.'),
        })
        .subscribe();
    } finally {
      this.openingPdfId.set(null);
    }
  }

  /**
   * Elimina inmediatamente un PDF persistido
   * y lo retira del estado visible.
   */
  private async deletePdf(idPedido: number, idPedidoArchivo: number): Promise<void> {
    if (this.processing()) {
      return;
    }

    this.deletingPdfId.set(idPedidoArchivo);

    try {
      await this.comprasService.deletePedidoPdf(idPedido, idPedidoArchivo);

      this.files.update(
        (currentFiles: readonly PedidoArchivoInterface[]): readonly PedidoArchivoInterface[] =>
          currentFiles.filter(
            (file: PedidoArchivoInterface): boolean => file.id !== idPedidoArchivo,
          ),
      );
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido eliminar el PDF.'),
        })
        .subscribe();
    } finally {
      this.deletingPdfId.set(null);
    }
  }

  /**
   * Ejecuta la incorporación física y lógica
   * de un PDF y actualiza el listado visible.
   */
  private async attachPdf(idPedido: number): Promise<void> {
    if (this.attachingPdf()) {
      return;
    }

    this.attachingPdf.set(true);

    try {
      const file: PedidoArchivoInterface | null =
        await this.comprasService.attachPedidoPdf(idPedido);

      if (file === null) {
        return;
      }

      this.files.update(
        (currentFiles: readonly PedidoArchivoInterface[]): readonly PedidoArchivoInterface[] => [
          ...currentFiles,
          file,
        ],
      );
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido adjuntar el PDF.'),
        })
        .subscribe();
    } finally {
      this.attachingPdf.set(false);
    }
  }

  /**
   * Incorpora el artículo recién creado cuando la
   * navegación actual vuelve desde Artículos.
   */
  private async addReturnedArticleFromNavigation(idPedido: number): Promise<void> {
    const idArticulo: number | null = getPurchaseOrderReturnedArticleId(
      this.purchaseOrderArticleFlow,
      idPedido,
    );

    if (idArticulo === null) {
      return;
    }

    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null || state.recepcionado) {
      return;
    }

    try {
      const articulo: PedidoArticuloInterface | null =
        await this.comprasService.getPedidoArticuloById(idArticulo);

      if (articulo === null) {
        this.dialog
          .alert({
            title: 'Atención',
            content: 'El artículo creado ya no está disponible.',
          })
          .subscribe();

        return;
      }

      const currentLines: readonly PurchaseOrderLineState[] = this.lines();

      const result: AddPurchaseOrderArticlesResult = addPurchaseOrderArticles(currentLines, [
        articulo,
      ]);

      if (result.lines !== currentLines) {
        this.lines.set(result.lines);
      }

      const targetLine: PurchaseOrderLineState | undefined = result.lines.find(
        (line: PurchaseOrderLineState): boolean => line.idArticulo === articulo.id,
      );

      if (targetLine !== undefined) {
        this.pendingUnitsFocusLineKey.set(targetLine.key);
      }
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(
            error,
            'No se ha podido incorporar el artículo creado al pedido.',
          ),
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
      this.markCurrentStateClean();

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
      this.markCurrentStateClean();
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
    this.cleanFingerprint.set(null);
    this.loading.set(true);
    this.loadError.set(null);

    try {
      const idPedido: number | null = parsePurchaseOrderRouteId(
        this.route.snapshot.paramMap.get('idPedido'),
      );

      const [appData, options, pedido, lines, files]: [
        Awaited<ReturnType<AppDataService['load']>>,
        PedidoFormOptionsInterface,
        PedidoCabeceraInterface | null,
        readonly PedidoLineaInterface[],
        readonly PedidoArchivoInterface[],
      ] = await Promise.all([
        this.appDataService.load(),
        this.comprasService.getPedidoFormOptions(),
        idPedido === null ? Promise.resolve(null) : this.comprasService.getPedido(idPedido),
        idPedido === null
          ? Promise.resolve<readonly PedidoLineaInterface[]>([])
          : this.comprasService.getPedidoLineas(idPedido),
        idPedido === null
          ? Promise.resolve<readonly PedidoArchivoInterface[]>([])
          : this.comprasService.getPedidoArchivos(idPedido),
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
      this.files.set(files);
      this.providerOptions.set(buildPurchaseOrderProviderOptions(options.proveedores, pedido));
      this.paymentOptions.set(buildPurchaseOrderPaymentOptions(options.tiposPago, pedido));

      this.formState.set(
        pedido === null
          ? createNewPurchaseOrderFormState(appData?.tipoIva === 're')
          : createExistingPurchaseOrderFormState(pedido),
      );
      this.markCurrentStateClean();

      if (idPedido !== null) {
        await this.addReturnedArticleFromNavigation(idPedido);
      }

      if (this.showSaveFeedbackAfterLoad) {
        this.showSaveFeedbackAfterLoad = false;
        this.showSaveFeedback();
      }
    } catch (error: unknown) {
      const message: string = getErrorMessage(error, 'No se ha podido cargar la ficha de Pedido.');

      this.formState.set(null);
      this.lines.set([]);
      this.files.set([]);
      this.providerOptions.set([]);
      this.paymentOptions.set([]);
      this.taxPairs.set([]);
      this.loadError.set(message);
      this.cleanFingerprint.set(null);

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

  /**
   * Registra el estado actual de cabecera y líneas
   * como última versión limpia conocida.
   */
  private markCurrentStateClean(): void {
    const state: PurchaseOrderFormState | null = this.formState();

    if (state === null) {
      this.cleanFingerprint.set(null);

      return;
    }

    this.cleanFingerprint.set(buildPurchaseOrderDirtyFingerprint(state, this.lines()));
  }
}
