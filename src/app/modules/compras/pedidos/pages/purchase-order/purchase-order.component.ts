import {
  Component,
  computed,
  inject,
  signal,
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
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
  PedidoSaveCommand,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type { PedidoTipo } from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import {
  buildPurchaseOrderPaymentOptions,
  buildPurchaseOrderProviderOptions,
  buildPurchaseOrderSaveCommand,
  createExistingPurchaseOrderFormState,
  createNewPurchaseOrderFormState,
  getPurchaseOrderPaymentKey,
  normalizePurchaseOrderColumns,
  parsePurchaseOrderRouteId,
  parsePurchaseOrderTipo,
  PURCHASE_ORDER_COLUMN_OPTIONS,
  type PurchaseOrderColumnOption,
  type PurchaseOrderFormState,
  type PurchaseOrderPaymentOption,
  type PurchaseOrderProviderOption,
  type PurchaseOrderTextField,
} from '@modules/compras/pedidos/pages/purchase-order/purchase-order.component.private';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import ComprasService from '@services/compras.service';
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
  private readonly dialog: DialogService = inject(DialogService);

  readonly appDataService: AppDataService = inject(AppDataService);

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

  readonly processing: Signal<boolean> = computed((): boolean => this.saving() || this.deleting());
  readonly saveSuccessful: WritableSignal<boolean> = signal<boolean>(false);

  private saveFeedbackTimeoutId: number | null = null;

  private showSaveFeedbackAfterLoad: boolean =
    this.router.currentNavigation()?.extras.state?.['purchaseOrderSaveSuccessful'] === true;
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);

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
   * Actualiza el uso de Recargo de Equivalencia.
   */
  onRecargoEquivalenciaChange(event: MatCheckboxChange): void {
    this.updateState({
      recargoEquivalencia: event.checked,
    });
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
   * Persiste la cabecera, relee su estado canónico y,
   * si es nueva, actualiza la URL con su identificador.
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
      const command: PedidoSaveCommand = buildPurchaseOrderSaveCommand(state);

      const wasNew: boolean = command.id === null;

      const idPedido: number = await this.comprasService.savePedido(command);

      const pedido: PedidoCabeceraInterface | null = await this.comprasService.getPedido(idPedido);

      if (pedido === null) {
        throw new Error('El pedido se ha guardado pero no se ha podido volver a cargar.');
      }

      this.formState.set(createExistingPurchaseOrderFormState(pedido));
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

      const [appData, options, pedido]: [
        Awaited<ReturnType<AppDataService['load']>>,
        PedidoFormOptionsInterface,
        PedidoCabeceraInterface | null,
      ] = await Promise.all([
        this.appDataService.load(),
        this.comprasService.getPedidoFormOptions(),
        idPedido === null ? Promise.resolve(null) : this.comprasService.getPedido(idPedido),
      ]);

      if (idPedido !== null && pedido === null) {
        throw new Error('El pedido indicado no existe.');
      }

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
      this.providerOptions.set([]);
      this.paymentOptions.set([]);
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
