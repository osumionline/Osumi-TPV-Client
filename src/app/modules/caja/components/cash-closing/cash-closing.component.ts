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
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import type CajaAbiertaInterface from '@desktop-contracts/caja/caja-abierta.interface';
import type {
  CajaCierreInterface,
  CajaCierreTipoPagoInterface,
} from '@desktop-contracts/caja/caja-cierre.interface';
import createCajaCierreFormInitialValue from '@model/caja/caja-cierre-form.initial-value';
import type {
  CajaCierreFormModel,
  CajaCierreRecuentoFormModel,
} from '@model/caja/caja-cierre-form.model';
import cajaCierreFormSchema from '@model/caja/caja-cierre-form.schema';
import createCajaCierreTipoPagoInitialValue from '@model/caja/caja-cierre-tipo-pago.initial-value';
import type CajaCierreTipoPagoModel from '@model/caja/caja-cierre-tipo-pago.model';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import CajaCierreService from '@services/caja/caja-cierre.service';
import VentasContextService from '@services/ventas/ventas-context.service';
import { getErrorMessage } from '@utils/error.utils';
import { eurosToCents } from '@utils/money.utils';

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
  ],
})
export default class CashClosingComponent implements OnInit {
  private readonly cajaCierreService: CajaCierreService = inject(CajaCierreService);
  readonly ventasContextService: VentasContextService = inject(VentasContextService);

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
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
