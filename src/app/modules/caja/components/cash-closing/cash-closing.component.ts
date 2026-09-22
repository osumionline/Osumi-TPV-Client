import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  signal,
  type OnInit,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FieldTree, form, FormField } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type {
  CajaCierreInterface,
  CajaCierreTipoPagoInterface,
} from '@desktop-contracts/caja/caja-cierre.interface';
import type {
  CerrarCajaCommand,
  CerrarCajaRecuentoCommand,
  CerrarCajaTipoPagoCommand,
} from '@desktop-contracts/caja/cerrar-caja-command.interface';
import createCajaCierreFormInitialValue from '@model/caja/caja-cierre-form.initial-value';
import type {
  CajaCierreFormModel,
  CajaCierreRecuentoFormModel,
} from '@model/caja/caja-cierre-form.model';
import cajaCierreFormSchema from '@model/caja/caja-cierre-form.schema';
import createCajaCierreTipoPagoInitialValue from '@model/caja/caja-cierre-tipo-pago.initial-value';
import type CajaCierreTipoPagoModel from '@model/caja/caja-cierre-tipo-pago.model';
import { DialogService } from '@osumi/angular-tools';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import CajaCierreService from '@services/caja/caja-cierre.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import { getErrorMessage } from '@utils/error.utils';
import { eurosToCents } from '@utils/money.utils';
import { firstValueFrom } from 'rxjs';

const CAJA_RECUENTO_FIELDS: readonly (readonly [keyof CajaCierreRecuentoFormModel, number])[] = [
  ['cent1', 1],
  ['cent2', 2],
  ['cent5', 5],
  ['cent10', 10],
  ['cent20', 20],
  ['cent50', 50],

  ['euro1', 100],
  ['euro2', 200],
  ['euro5', 500],
  ['euro10', 1_000],
  ['euro20', 2_000],
  ['euro50', 5_000],
  ['euro100', 10_000],
  ['euro200', 20_000],
  ['euro500', 50_000],
];

/**
 * Prepara visualmente los datos necesarios para cerrar
 * la caja actualmente abierta.
 */
@Component({
  selector: 'otpv-cash-closing',
  templateUrl: './cash-closing.component.html',
  styleUrl: './cash-closing.component.scss',
  imports: [
    CentsToEurosPipe,
    CurrencyPipe,
    DatePipe,
    FormField,
    MatFormFieldModule,
    MatIcon,
    MatInput,
    MatButton,
  ],
})
export default class CashClosingComponent implements OnInit {
  private readonly cajaCierreService: CajaCierreService = inject(CajaCierreService);
  readonly ventasContextService: VentasContextService = inject(VentasContextService);
  private readonly dialog: DialogService = inject(DialogService);

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly closing: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);
  readonly cierre: WritableSignal<CajaCierreInterface | null> = signal<CajaCierreInterface | null>(
    null,
  );
  readonly recuentoOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly tiposPago: WritableSignal<readonly CajaCierreTipoPagoModel[]> = signal<
    readonly CajaCierreTipoPagoModel[]
  >([]);
  readonly cierreDataModel: WritableSignal<CajaCierreFormModel> = signal<CajaCierreFormModel>(
    createCajaCierreFormInitialValue(),
  );
  /**
   * Calcula el efectivo físico real a partir exclusivamente
   * del número de monedas y billetes contados.
   *
   * Mientras no se haya introducido ninguna cantidad devuelve
   * null para distinguir "sin contar" de un recuento real de 0 €.
   */
  readonly importeRealCents: Signal<number | null> = computed((): number | null => {
    const recuento: CajaCierreRecuentoFormModel = this.cierreDataModel().recuento;

    const cantidades: readonly (readonly [number | null, number])[] = [
      [recuento.cent1, 1],
      [recuento.cent2, 2],
      [recuento.cent5, 5],
      [recuento.cent10, 10],
      [recuento.cent20, 20],
      [recuento.cent50, 50],

      [recuento.euro1, 100],
      [recuento.euro2, 200],
      [recuento.euro5, 500],
      [recuento.euro10, 1_000],
      [recuento.euro20, 2_000],
      [recuento.euro50, 5_000],
      [recuento.euro100, 10_000],
      [recuento.euro200, 20_000],
      [recuento.euro500, 50_000],
    ];

    let hasRecuento: boolean = false;
    let totalCents: number = 0;

    for (const [cantidad, valorCents] of cantidades) {
      if (cantidad === null) {
        continue;
      }

      hasRecuento = true;

      if (!Number.isSafeInteger(cantidad) || cantidad < 0) {
        return null;
      }

      const subtotalCents: number = cantidad * valorCents;

      if (!Number.isSafeInteger(subtotalCents)) {
        return null;
      }

      totalCents += subtotalCents;

      if (!Number.isSafeInteger(totalCents)) {
        return null;
      }
    }

    return hasRecuento ? totalCents : null;
  });

  readonly cierreForm: FieldTree<CajaCierreFormModel> = form(
    this.cierreDataModel,
    cajaCierreFormSchema,
  );

  readonly retiradoCents: Signal<number> = computed((): number =>
    this.moneyInputToCents(this.cierreDataModel().retiradoEuros),
  );

  readonly entradaCents: Signal<number> = computed((): number =>
    this.moneyInputToCents(this.cierreDataModel().entradaEuros),
  );

  /**
   * Conserva la fórmula del TPV anterior:
   *
   * real + retirado - saldo final teórico.
   */
  readonly diferenciaCents: Signal<number | null> = computed((): number | null => {
    const cierre: CajaCierreInterface | null = this.cierre();
    const realCents: number | null = this.importeRealCents();

    if (cierre === null || realCents === null) {
      return null;
    }

    return realCents + this.retiradoCents() - cierre.saldoFinalTeoricoCents;
  });

  /**
   * Conserva la fórmula del TPV anterior:
   *
   * real + entrada.
   */
  readonly saldoSiguienteCents: Signal<number | null> = computed((): number | null => {
    const realCents: number | null = this.importeRealCents();

    if (realCents === null) {
      return null;
    }

    return realCents + this.entradaCents();
  });

  readonly canClose: Signal<boolean> = computed(
    (): boolean =>
      this.cierre() !== null &&
      !this.loading() &&
      !this.closing() &&
      !this.cierreForm().invalid() &&
      this.importeRealCents() !== null &&
      this.tiposPago().every(
        (tipoPago: CajaCierreTipoPagoModel): boolean => tipoPago.importeRealCents !== null,
      ),
  );

  /**
   * Refresca el contexto operativo y carga el snapshot
   * canónico de la caja abierta.
   */
  ngOnInit(): void {
    void this.load();
  }

  /**
   * Recupera los datos necesarios para preparar el cierre.
   */
  async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);
    this.cierre.set(null);
    this.recuentoOpen.set(false);
    this.tiposPago.set([]);
    this.cierreForm().reset(createCajaCierreFormInitialValue());

    try {
      await this.ventasContextService.reload();

      const caja: CajaAbiertaInterface | null = this.ventasContextService.cajaAbierta();

      if (caja === null) {
        return;
      }

      const cierre: CajaCierreInterface = await this.cajaCierreService.getCierre({
        cajaPublicId: caja.publicId,
      });
      console.log(cierre);

      this.cierre.set(cierre);
      this.tiposPago.set(
        cierre.tiposPago
          .filter((tipoPago: CajaCierreTipoPagoInterface): boolean => tipoPago.slug !== 'efectivo')
          .map((tipoPago: CajaCierreTipoPagoInterface): CajaCierreTipoPagoModel =>
            createCajaCierreTipoPagoInitialValue(tipoPago),
          ),
      );
    } catch (error: unknown) {
      this.error.set(
        getErrorMessage(error, 'No se han podido recuperar los datos del cierre de caja.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Muestra u oculta el desglose físico de monedas y billetes.
   */
  toggleRecuento(): void {
    this.recuentoOpen.update((open: boolean): boolean => !open);
  }

  /**
   * Selecciona el contenido completo de un campo de cantidad
   * para agilizar el recuento con teclado.
   */
  selectCountInput(event: FocusEvent): void {
    const input: HTMLInputElement = event.currentTarget as HTMLInputElement;

    input.select();
  }

  /**
   * Despliega o contrae un único tipo de pago.
   */
  toggleTipoPago(publicId: string): void {
    this.tiposPago.update(
      (tiposPago: readonly CajaCierreTipoPagoModel[]): readonly CajaCierreTipoPagoModel[] =>
        tiposPago.map((tipoPago: CajaCierreTipoPagoModel): CajaCierreTipoPagoModel =>
          tipoPago.publicId === publicId
            ? {
                ...tipoPago,
                expanded: !tipoPago.expanded,
              }
            : tipoPago,
        ),
    );
  }

  /**
   * Actualiza el importe real introducido para un tipo de pago.
   */
  updateTipoPagoImporteReal(publicId: string, event: Event): void {
    const input: HTMLInputElement = event.currentTarget as HTMLInputElement;

    let importeRealCents: number | null = null;

    if (input.value.trim() !== '') {
      const importeEuros: number = input.valueAsNumber;

      if (Number.isFinite(importeEuros)) {
        try {
          importeRealCents = eurosToCents(importeEuros);
        } catch {
          importeRealCents = null;
        }
      }
    }

    this.tiposPago.update(
      (tiposPago: readonly CajaCierreTipoPagoModel[]): readonly CajaCierreTipoPagoModel[] =>
        tiposPago.map((tipoPago: CajaCierreTipoPagoModel): CajaCierreTipoPagoModel =>
          tipoPago.publicId === publicId
            ? {
                ...tipoPago,
                importeRealCents,
              }
            : tipoPago,
        ),
    );
  }

  /**
   * Calcula la diferencia entre el importe real introducido
   * y las ventas canónicas del tipo de pago.
   */
  getTipoPagoDiferenciaCents(tipoPago: CajaCierreTipoPagoModel): number | null {
    if (tipoPago.importeRealCents === null) {
      return null;
    }

    return tipoPago.importeRealCents - tipoPago.importeVentasCents;
  }

  /**
   * Solicita confirmación y cierra definitivamente
   * la caja actualmente preparada.
   */
  async closeCaja(): Promise<void> {
    if (!this.canClose()) {
      return;
    }

    const command: CerrarCajaCommand | null = this.buildCloseCommand();

    if (command === null) {
      return;
    }

    const diferenciaCents: number | null = this.diferenciaCents();

    const content: string =
      diferenciaCents !== null && diferenciaCents < 0
        ? 'El recuento presenta una diferencia negativa. ¿Estás seguro de querer cerrar definitivamente esta caja?'
        : '¿Estás seguro de querer cerrar definitivamente esta caja?';

    const confirmed: boolean = await firstValueFrom(
      this.dialog.confirm({
        title: 'Cerrar caja',
        content,
        warn: true,
        ok: 'Cerrar caja',
        cancel: 'Cancelar',
      }),
    );

    if (!confirmed) {
      return;
    }

    this.closing.set(true);

    try {
      await this.cajaCierreService.close(command);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido cerrar la caja.'),
        })
        .subscribe();

      return;
    } finally {
      this.closing.set(false);
    }

    /*
     * El cierre ya se ha confirmado en SQLite.
     *
     * Limpiamos inmediatamente el contexto en memoria para que,
     * incluso si la recarga posterior falla, el renderer no siga
     * creyendo que puede vender sobre la caja ya cerrada.
     */
    this.ventasContextService.clear();
    this.clearAfterClose();

    try {
      await this.ventasContextService.reload();
    } catch (error: unknown) {
      console.error('Error reloading ventas context:', error);
      await firstValueFrom(
        this.dialog.alert({
          title: 'Caja cerrada',
          content:
            'La caja se ha cerrado correctamente, pero no se ha podido actualizar el contexto operativo. Será necesario volver a cargarlo antes de continuar.',
        }),
      );

      return;
    }

    await firstValueFrom(
      this.dialog.alert({
        title: 'Caja cerrada',
        content: 'La caja se ha cerrado correctamente.',
      }),
    );
  }

  private buildCloseCommand(): CerrarCajaCommand | null {
    const cierre: CajaCierreInterface | null = this.cierre();

    if (cierre === null || this.importeRealCents() === null) {
      return null;
    }

    const recuento: readonly CerrarCajaRecuentoCommand[] = this.buildRecuentoCommand();

    if (recuento.length === 0) {
      return null;
    }

    const tiposPago: CerrarCajaTipoPagoCommand[] = [];

    for (const tipoPago of this.tiposPago()) {
      if (tipoPago.importeRealCents === null) {
        return null;
      }

      tiposPago.push({
        tipoPagoPublicId: tipoPago.publicId,
        importeRealCents: tipoPago.importeRealCents,
      });
    }

    return {
      cajaPublicId: cierre.cajaPublicId,
      retiradoCents: this.retiradoCents(),
      entradaCents: this.entradaCents(),
      recuento,
      tiposPago,
    };
  }

  private buildRecuentoCommand(): readonly CerrarCajaRecuentoCommand[] {
    const recuento: CajaCierreRecuentoFormModel = this.cierreDataModel().recuento;

    const result: CerrarCajaRecuentoCommand[] = [];

    for (const [field, valorCents] of CAJA_RECUENTO_FIELDS) {
      const cantidad: number | null = recuento[field];

      if (cantidad === null) {
        continue;
      }

      result.push({
        valorCents,
        cantidad,
      });
    }

    return result;
  }

  private clearAfterClose(): void {
    this.cierre.set(null);
    this.tiposPago.set([]);
    this.recuentoOpen.set(false);
    this.cierreForm().reset(createCajaCierreFormInitialValue());
  }

  /**
   * Convierte un importe editable en euros a céntimos
   * sin propagar valores incompletos del formulario.
   */
  private moneyInputToCents(value: number): number {
    if (!Number.isFinite(value) || value < 0) {
      return 0;
    }

    try {
      return eurosToCents(value);
    } catch {
      return 0;
    }
  }
}
