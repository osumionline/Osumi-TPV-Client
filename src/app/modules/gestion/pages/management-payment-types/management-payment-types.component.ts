import {
  afterNextRender,
  Component,
  computed,
  inject,
  Injector,
  signal,
  viewChild,
  type ElementRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import {
  FieldTree,
  form,
  FormField,
} from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import {
  MatTabsModule,
} from '@angular/material/tabs';
import { RouterLink } from '@angular/router';
import createTipoPagoDataFormInitialValue from '@model/tipos-pago/tipo-pago-data-form.initial-value';
import type {
  TipoPagoDataFormModel,
} from '@model/tipos-pago/tipo-pago-data-form.model';
import tipoPagoDataFormSchema from '@model/tipos-pago/tipo-pago-data-form.schema';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';

const EFECTIVO_SLUG: string = 'efectivo';

/**
 * Muestra y permite seleccionar los tipos de pago
 * configurables desde el apartado de Gestión.
 */
@Component({
  selector: 'otpv-management-payment-types',
  templateUrl:
    './management-payment-types.component.html',
  styleUrl:
    './management-payment-types.component.scss',
  imports: [
    RouterLink,
    FormField,
    MatButton,
    MatCheckbox,
    MatFormFieldModule,
    MatIcon,
    MatInput,
    MatTabsModule,
  ],
})
export default class ManagementPaymentTypesComponent {
  private readonly tiposPagoService:
    TiposPagoService =
    inject(TiposPagoService);

  private readonly injector:
    Injector =
    inject(Injector);

  private readonly nombreInput =
    viewChild<
      ElementRef<HTMLInputElement>
    >('nombreInput');

  private nombreFocusPending:
    boolean = false;

  readonly searchTerm:
    WritableSignal<string> =
    signal<string>('');

  readonly selectedTipoPago:
    WritableSignal<TipoPago | null> =
    signal<TipoPago | null>(null);

  readonly creatingTipoPago:
    WritableSignal<boolean> =
    signal<boolean>(false);
readonly selectedTabIndex:
  WritableSignal<number> =
  signal<number>(0);

  readonly tipoPagoDataModel:
    WritableSignal<TipoPagoDataFormModel> =
    signal<TipoPagoDataFormModel>(
      createTipoPagoDataFormInitialValue(
        null,
      ),
    );

  readonly tipoPagoDataForm:
    FieldTree<TipoPagoDataFormModel> =
    form(
      this.tipoPagoDataModel,
      (path): void => {
        tipoPagoDataFormSchema(
          path,
        );
      },
    );

  /**
   * Subconjunto configurable desde Gestión.
   *
   * Efectivo pertenece al maestro global pero es
   * estructural y no puede gestionarse desde aquí.
   */
  readonly tiposPagoConfigurables:
    Signal<readonly TipoPago[]> =
    computed(
      (): readonly TipoPago[] =>
        this.tiposPagoService
          .tiposPago()
          .filter(
            (
              tipoPago: TipoPago,
            ): boolean =>
              tipoPago.slug
                .toLocaleLowerCase(
                  'es-ES',
                ) !==
              EFECTIVO_SLUG,
          ),
    );

  readonly filteredTiposPago:
    Signal<readonly TipoPago[]> =
    computed(
      (): readonly TipoPago[] => {
        const searchTerm:
          string =
          this.searchTerm()
            .trim()
            .toLocaleLowerCase(
              'es-ES',
            );

        if (searchTerm === '') {
          return this
            .tiposPagoConfigurables();
        }

        return this
          .tiposPagoConfigurables()
          .filter(
            (
              tipoPago: TipoPago,
            ): boolean =>
              tipoPago.nombre
                .toLocaleLowerCase(
                  'es-ES',
                )
                .includes(
                  searchTerm,
                ),
          );
      },
    );

  /**
   * Actualiza el texto utilizado para
   * filtrar los tipos de pago.
   */
  updateSearchTerm(
    value: string,
  ): void {
    this.searchTerm.set(
      value,
    );
  }

  /**
   * Selecciona un tipo de pago existente
   * y carga sus datos en el formulario.
   */
  selectTipoPago(
    tipoPago: TipoPago,
  ): void {
    this.creatingTipoPago.set(
      false,
    );

    this.selectedTipoPago.set(
      tipoPago,
    );

    this.resetTipoPagoDataForm(
      tipoPago,
    );

    this.focusNombreInput();
  }

  /**
   * Abre el editor para crear un nuevo
   * tipo de pago.
   */
  startCreatingTipoPago(): void {
    this.selectedTipoPago.set(
      null,
    );

    this.creatingTipoPago.set(
      true,
    );

    this.resetTipoPagoDataForm(
      null,
    );

    this.focusNombreInput();
  }

  /**
   * Descarta los cambios realizados
   * en los datos del tipo de pago.
   *
   * En un alta vuelve al estado inicial.
   * En edición restaura los datos persistidos.
   */
  cancelTipoPagoChanges(): void {
    if (
      this.creatingTipoPago()
    ) {
      this.creatingTipoPago.set(
        false,
      );

      this.selectedTipoPago.set(
        null,
      );

      this.resetTipoPagoDataForm(
        null,
      );

      return;
    }

    const tipoPago:
      TipoPago | null =
      this.selectedTipoPago();

    if (tipoPago !== null) {
      this.resetTipoPagoDataForm(
        tipoPago,
      );
    }
  }

  /**
 * Aplica el foco pendiente en Nombre
 * cuando termina el cambio a Datos.
 */
handleTabAnimationDone(): void {
  if (
    !this.nombreFocusPending
  ) {
    return;
  }

  this.nombreFocusPending =
    false;

  if (
    this.selectedTabIndex() !== 0
  ) {
    return;
  }

  this.nombreInput()
    ?.nativeElement
    .focus();
}

  /**
 * Muestra la pestaña Datos y pone
 * el foco en Nombre.
 */
private focusNombreInput(): void {
  /*
   * Si ya estamos en Datos no existe
   * una transición de pestaña que pueda
   * robarnos posteriormente el foco.
   */
  if (
    this.selectedTabIndex() === 0
  ) {
    afterNextRender(
      (): void => {
        this.nombreInput()
          ?.nativeElement
          .focus();
      },
      {
        injector:
          this.injector,
      },
    );

    return;
  }

  /*
   * Si venimos de Estadísticas esperamos
   * a que Material termine la transición.
   */
  this.nombreFocusPending =
    true;

  this.selectedTabIndex.set(
    0,
  );
}

/**
 * Mantiene sincronizada la pestaña activa
 * cuando el usuario cambia de pestaña.
 */
handleTabIndexChange(
  index: number,
): void {
  this.selectedTabIndex.set(
    index,
  );
}

  private resetTipoPagoDataForm(
    tipoPago: TipoPago | null,
  ): void {
    this.tipoPagoDataForm()
      .reset(
        createTipoPagoDataFormInitialValue(
          tipoPago,
        ),
      );
  }
}