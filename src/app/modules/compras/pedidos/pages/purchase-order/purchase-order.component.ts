import {
  Component,
  computed,
  inject,
  signal,
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
import { ActivatedRoute, RouterLink } from '@angular/router';
import HeaderComponent from '@app/components/header/header.component';
import type {
  PedidoCabeceraInterface,
  PedidoFormOptionsInterface,
} from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type { PedidoTipo } from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import {
  buildPurchaseOrderPaymentOptions,
  buildPurchaseOrderProviderOptions,
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
export default class PurchaseOrderComponent implements OnInit {
  private readonly route: ActivatedRoute = inject(ActivatedRoute);
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
   * Reintenta una carga fallida de la ficha.
   */
  retryLoad(): void {
    void this.loadPage();
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
   * Carga en paralelo la configuración general, las opciones
   * de formulario y, cuando procede, el pedido persistido.
   */
  private async loadPage(): Promise<void> {
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
   * Aplica un cambio parcial al estado editable actual.
   */
  private updateState(patch: Partial<PurchaseOrderFormState>): void {
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
