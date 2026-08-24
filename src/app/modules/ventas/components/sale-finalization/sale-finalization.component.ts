import { CurrencyPipe } from '@angular/common';
import {
  Component,
  computed,
  input,
  output,
  signal,
  viewChild,
  type AfterViewInit,
  type ElementRef,
  type InputSignal,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatSelectModule, type MatSelectChange } from '@angular/material/select';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import type VentaFinalizacionAccion from '@model/ventas/venta-finalizacion-accion.type';
import VentaFinalizacionEnCurso from '@model/ventas/venta-finalizacion-en-curso.model';
import type { VentaFinalizacionResultado } from '@model/ventas/venta-finalizacion-resultado.interface';
import type VentaFinalizacionSolicitud from '@model/ventas/venta-finalizacion-solicitud.interface';
import type VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import type VentaPagoEnCurso from '@model/ventas/venta-pago-en-curso.model';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import { getErrorMessage } from '@utils/error.utils';
import { centsToEuros, eurosToCents } from '@utils/money.utils';

@Component({
  selector: 'otpv-sale-finalization',
  templateUrl: './sale-finalization.component.html',
  styleUrl: './sale-finalization.component.scss',
  imports: [
    CurrencyPipe,
    MatButton,
    MatFormFieldModule,
    MatIcon,
    MatIconButton,
    MatInput,
    MatSelectModule,
    CentsToEurosPipe,
    MicrosToEurosPipe,
  ],
})
export default class SaleFinalizationComponent implements AfterViewInit, OnInit {
  readonly totalCents: InputSignal<number> = input.required<number>();
  readonly lineas: InputSignal<readonly VentaLineaEnCurso[]> =
    input.required<readonly VentaLineaEnCurso[]>();
  readonly tiposPago: InputSignal<readonly TipoPago[]> = input.required<readonly TipoPago[]>();

  readonly reservaBlockedReason: InputSignal<string | null> = input<string | null>(null);

  readonly reservaSaving: InputSignal<boolean> = input<boolean>(false);
  readonly ventaSaving: InputSignal<boolean> = input<boolean>(false);

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly finalizeEvent: OutputEmitterRef<VentaFinalizacionSolicitud> =
    output<VentaFinalizacionSolicitud>();

  readonly reservaSinTicketEvent: OutputEmitterRef<void> = output<void>();
  readonly reservaConTicketEvent: OutputEmitterRef<void> = output<void>();

  readonly saving: Signal<boolean> = computed(
    (): boolean => this.reservaSaving() || this.ventaSaving(),
  );

  /**
   * El modelo es mutable durante la interacción.
   *
   * Se fuerza la notificación aunque la referencia siga siendo
   * la misma, igual que hacemos con otros modelos vivos de Ventas.
   */
  readonly finalizacion: WritableSignal<VentaFinalizacionEnCurso | null> =
    signal<VentaFinalizacionEnCurso | null>(null, {
      equal: (): boolean => false,
    });

  readonly cambioTotalCents: Signal<number> = computed((): number => {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (finalizacion === null) {
      return 0;
    }

    return finalizacion.pagos.reduce(
      (total: number, pago: VentaPagoEnCurso): number => total + pago.cambioCents,
      0,
    );
  });

  getLineaDescuentoMicros(linea: VentaLineaEnCurso): number {
    if (linea.regalo) {
      return 0;
    }

    const importeBaseMicros: number = Math.abs(linea.importeBaseMicros);
    const importeFinalMicros: number = Math.abs(linea.importeFinalMicros);

    return Math.max(0, importeBaseMicros - importeFinalMicros);
  }

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly tiposPagoFisicos: Signal<readonly TipoPago[]> = computed((): readonly TipoPago[] =>
    [...this.tiposPago()]
      .filter((tipoPago: TipoPago): boolean => tipoPago.fisico)
      .sort(
        (a: TipoPago, b: TipoPago): number =>
          a.orden - b.orden || a.nombre.localeCompare(b.nombre, 'es'),
      ),
  );

  readonly tipoPagoEfectivo: Signal<TipoPago | null> = computed((): TipoPago | null => {
    return (
      this.tiposPagoFisicos().find((tipoPago: TipoPago): boolean => tipoPago.slug === 'efectivo') ??
      null
    );
  });

  readonly pagosEditables: Signal<readonly VentaPagoEnCurso[]> = computed(
    (): readonly VentaPagoEnCurso[] => {
      const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

      if (finalizacion === null) {
        return [];
      }

      if (finalizacion.totalCents > 0) {
        return finalizacion.pagos.filter((pago: VentaPagoEnCurso): boolean => !pago.esEfectivo);
      }

      return finalizacion.pagos;
    },
  );

  readonly tipoPagoActivoPublicId: WritableSignal<string | null> = signal<string | null>(null);

  private readonly efectivoInput = viewChild<ElementRef<HTMLInputElement>>('efectivoInput');

  readonly accion: WritableSignal<VentaFinalizacionAccion> =
    signal<VentaFinalizacionAccion>('imprimir-ticket');

  readonly accionEsReserva: Signal<boolean> = computed((): boolean => {
    const accion: VentaFinalizacionAccion = this.accion();

    return accion === 'reserva' || accion === 'reserva-sin-ticket';
  });

  readonly puedeEjecutarAccion: Signal<boolean> = computed((): boolean => {
    if (this.saving()) {
      return false;
    }

    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (finalizacion === null) {
      return false;
    }

    switch (this.accion()) {
      case 'imprimir-ticket':
      case 'no-imprimir-ticket':
        return finalizacion.completa;

      case 'reserva':
      case 'reserva-sin-ticket':
        return this.reservaBlockedReason() === null;

      case 'ticket-regalo':
      case 'factura':
      case 'email':
        return false;
    }
  });

  /**
   * Cada apertura del componente crea una finalización nueva.
   *
   * Cancelar el overlay descarta por tanto todo su estado.
   */
  ngOnInit(): void {
    const finalizacion: VentaFinalizacionEnCurso = new VentaFinalizacionEnCurso(this.totalCents());

    this.finalizacion.set(finalizacion);

    if (finalizacion.totalCents > 0) {
      this.tipoPagoActivoPublicId.set(this.tipoPagoEfectivo()?.publicId ?? null);
    }
  }

  ngAfterViewInit(): void {
    if (this.totalCents() > 0) {
      this.focusEfectivoInput();
    }
  }

  /**
   * Selecciona un medio de pago y aplica su comportamiento rápido.
   *
   * Efectivo únicamente recupera el foco de su campo rápido, mientras
   * que el resto de medios absorbe inicialmente todo el pendiente.
   * En modo reserva no se permite modificar pagos.
   */
  selectTipoPago(tipoPago: TipoPago): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (this.saving() || this.accionEsReserva() || finalizacion === null || finalizacion.completa) {
      return;
    }

    if (finalizacion.totalCents > 0 && tipoPago.slug === 'efectivo') {
      this.tipoPagoActivoPublicId.set(tipoPago.publicId);
      this.focusEfectivoInput();

      return;
    }

    const alreadyAdded: boolean = this.isTipoPagoAdded(tipoPago);

    this.addTipoPago(tipoPago);

    if (!alreadyAdded && this.isTipoPagoAdded(tipoPago)) {
      this.tipoPagoActivoPublicId.set(tipoPago.publicId);
    }
  }

  isTipoPagoSelected(tipoPago: TipoPago): boolean {
    if (this.isTipoPagoAdded(tipoPago)) {
      return true;
    }

    return tipoPago.publicId !== null && this.tipoPagoActivoPublicId() === tipoPago.publicId;
  }

  /**
   * Añade el tipo de pago indicado aplicando inicialmente
   * todo el importe que todavía queda pendiente.
   *
   * En los siguientes pasos podremos editar ese importe
   * para construir pagos múltiples.
   */
  addTipoPago(tipoPago: TipoPago): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (
      this.saving() ||
      finalizacion === null ||
      finalizacion.completa ||
      this.isTipoPagoAdded(tipoPago)
    ) {
      return;
    }

    try {
      finalizacion.addPago(tipoPago, finalizacion.pendienteCents);

      this.error.set(null);

      /*
       * La instancia es deliberadamente la misma.
       * El signal utiliza equal:false para notificar la mutación.
       */
      this.finalizacion.set(finalizacion);
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido añadir el medio de pago.'));
    }
  }

  /**
   * Devuelve el importe del pago como cantidad positiva
   * expresada en euros para su edición.
   *
   * En una devolución el signo negativo pertenece al dominio,
   * no a la interacción del usuario.
   */
  getPagoImporteEuros(pago: VentaPagoEnCurso): number {
    return Math.abs(centsToEuros(pago.importeCents));
  }

  /**
   * Devuelve el efectivo entregado por el cliente
   * como cantidad positiva expresada en euros.
   */
  getPagoEntregadoEuros(pago: VentaPagoEnCurso): number {
    if (!pago.esEfectivo || pago.entregadoCents === null) {
      return 0;
    }

    return centsToEuros(pago.entregadoCents);
  }

  getEfectivoEntregadoEuros(): number | '' {
    const pago: VentaPagoEnCurso | null = this.getPagoEfectivo();

    if (pago === null || pago.entregadoCents === null) {
      return '';
    }

    return centsToEuros(pago.entregadoCents);
  }

  /**
   * Actualiza en tiempo real el efectivo entregado mientras
   * el usuario escribe en el campo rápido.
   *
   * El importe aplicado nunca supera el pendiente y el exceso
   * se transforma automáticamente en cambio.
   */
  updateEfectivoRapido(event: Event): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();
    const tipoPagoEfectivo: TipoPago | null = this.tipoPagoEfectivo();

    if (
      this.saving() ||
      this.accionEsReserva() ||
      finalizacion === null ||
      finalizacion.totalCents <= 0 ||
      tipoPagoEfectivo === null
    ) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.tipoPagoActivoPublicId.set(tipoPagoEfectivo.publicId);

    const value: string = inputElement.value.trim();

    if (value === '') {
      this.clearPagoEfectivo(finalizacion);

      return;
    }

    const decimalSeparatorIndex: number = value.indexOf('.');

    if (decimalSeparatorIndex !== -1 && value.length - decimalSeparatorIndex - 1 > 2) {
      this.clearPagoEfectivo(finalizacion);
      this.error.set('El importe en efectivo no puede tener más de dos decimales.');

      return;
    }

    const euros: number = inputElement.valueAsNumber;

    /*
     * Durante la edición pueden existir estados transitorios,
     * por ejemplo justo después de escribir el separador decimal.
     *
     * No tocamos ni el input ni el modelo hasta que vuelva
     * a contener un número interpretable.
     */
    if (!Number.isFinite(euros)) {
      return;
    }

    if (euros <= 0) {
      this.clearPagoEfectivo(finalizacion);

      return;
    }

    try {
      const entregadoCents: number = eurosToCents(euros);

      if (entregadoCents <= 0) {
        this.clearPagoEfectivo(finalizacion);

        return;
      }

      const pagoActual: VentaPagoEnCurso | null = this.getPagoEfectivo();

      const importeActualCents: number = pagoActual?.importeCents ?? 0;

      const maxImporteCents: number = importeActualCents + finalizacion.pendienteCents;

      if (maxImporteCents <= 0) {
        throw new RangeError('No queda importe pendiente que pueda asignarse al efectivo.');
      }

      const importeCents: number = Math.min(entregadoCents, maxImporteCents);

      if (pagoActual === null) {
        finalizacion.addPago(tipoPagoEfectivo, importeCents, entregadoCents);
      } else {
        finalizacion.updatePago(pagoActual.tipoPagoPublicId, importeCents, entregadoCents);
      }

      this.error.set(null);
      this.finalizacion.set(finalizacion);
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido actualizar el pago en efectivo.'));
    }
  }

  /**
   * Aplica la acción final seleccionada y adapta el estado económico
   * del modal al modo venta o reserva.
   *
   * Al entrar en una reserva se descartan todos los pagos porque
   * la operación deja de representar un cobro. Al volver desde una
   * reserva a una acción de venta, el cobro comienza desde cero.
   */
  onAccionChange(event: MatSelectChange): void {
    const nuevaAccion: unknown = event.value;

    if (!this.isVentaFinalizacionAccion(nuevaAccion)) {
      return;
    }

    const accionAnterior: VentaFinalizacionAccion = this.accion();
    const anteriorEsReserva: boolean =
      accionAnterior === 'reserva' || accionAnterior === 'reserva-sin-ticket';

    const nuevaEsReserva: boolean =
      nuevaAccion === 'reserva' || nuevaAccion === 'reserva-sin-ticket';

    this.accion.set(nuevaAccion);

    if (nuevaEsReserva) {
      this.activateReservaMode();

      const blockedReason: string | null = this.reservaBlockedReason();

      this.error.set(blockedReason);

      return;
    }

    if (anteriorEsReserva) {
      this.activateVentaMode();
    }

    this.error.set(null);
  }

  /**
   * Recupera el foco en el campo rápido de efectivo cuando se cierra
   * el selector de acción estando en modo venta.
   *
   * Esperar al cierre del mat-select evita que Material restaure después
   * el foco sobre el propio selector y anule nuestro foco de caja.
   */
  onAccionSelectClosed(): void {
    if (this.saving() || this.accionEsReserva() || this.totalCents() <= 0) {
      return;
    }

    this.focusEfectivoInput();
  }

  /**
   * Comprueba que un valor recibido desde el mat-select
   * pertenece al conjunto cerrado de acciones de finalización.
   */
  private isVentaFinalizacionAccion(value: unknown): value is VentaFinalizacionAccion {
    return (
      value === 'imprimir-ticket' ||
      value === 'no-imprimir-ticket' ||
      value === 'ticket-regalo' ||
      value === 'reserva' ||
      value === 'reserva-sin-ticket' ||
      value === 'factura' ||
      value === 'email'
    );
  }

  normalizeEfectivoRapido(event: FocusEvent): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const entregadoEuros: number | '' = this.getEfectivoEntregadoEuros();

    inputElement.value = entregadoEuros === '' ? '' : String(entregadoEuros);
  }

  /**
   * Calcula el máximo que puede asignarse actualmente
   * a un pago sin superar el total de la operación.
   *
   * Incluye el importe que ya tiene ese mismo pago
   * más lo que todavía queda pendiente.
   */
  getPagoMaxEuros(pago: VentaPagoEnCurso): number {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (finalizacion === null) {
      return this.getPagoImporteEuros(pago);
    }

    return Math.abs(centsToEuros(pago.importeCents + finalizacion.pendienteCents));
  }

  /**
   * Selecciona el contenido completo de un input monetario
   * para facilitar la sustitución directa del importe.
   */
  selectInputContent(event: FocusEvent): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    inputElement.select();
  }

  /**
   * Actualiza el importe aplicado por un medio de pago.
   */
  updatePagoImporte(pago: VentaPagoEnCurso, event: Event): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (this.saving() || finalizacion === null) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const euros: number = inputElement.valueAsNumber;

    if (Number.isNaN(euros) || !Number.isFinite(euros) || euros <= 0) {
      this.error.set('El importe debe ser mayor que 0,00 €.');

      inputElement.value = String(this.getPagoImporteEuros(pago));

      return;
    }

    try {
      const importeAbsCents: number = eurosToCents(euros);

      if (importeAbsCents <= 0) {
        throw new RangeError('El importe debe ser mayor que 0,00 €.');
      }

      const maxImporteCents: number = Math.abs(pago.importeCents + finalizacion.pendienteCents);

      if (importeAbsCents > maxImporteCents) {
        throw new RangeError(
          `El importe no puede superar ${centsToEuros(maxImporteCents).toFixed(2)} €.`,
        );
      }

      const importeCents: number = finalizacion.totalCents < 0 ? -importeAbsCents : importeAbsCents;

      const pagoActualizado: VentaPagoEnCurso = finalizacion.updatePago(
        pago.tipoPagoPublicId,
        importeCents,
      );

      this.error.set(null);

      this.finalizacion.set(finalizacion);

      /*
       * Normalizamos también el valor visible por si el
       * usuario introdujo más de dos decimales.
       */
      inputElement.value = String(this.getPagoImporteEuros(pagoActualizado));
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido modificar el importe del pago.'));

      /*
       * updatePago() es atómico respecto al estado del modelo:
       * si falla, el pago original continúa intacto.
       */
      inputElement.value = String(this.getPagoImporteEuros(pago));
    }
  }

  /**
   * Actualiza la cantidad físicamente entregada
   * por el cliente para un pago en efectivo.
   *
   * No modifica el importe aplicado a la venta.
   */
  updatePagoEntregado(pago: VentaPagoEnCurso, event: Event): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (this.saving() || finalizacion === null || !pago.esEfectivo || pago.importeCents < 0) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const euros: number = inputElement.valueAsNumber;

    if (Number.isNaN(euros) || !Number.isFinite(euros) || euros <= 0) {
      this.error.set('La cantidad entregada debe ser mayor que 0,00 €.');

      inputElement.value = String(this.getPagoEntregadoEuros(pago));

      return;
    }

    try {
      const entregadoCents: number = eurosToCents(euros);

      if (entregadoCents < pago.importeCents) {
        throw new RangeError(
          `La cantidad entregada no puede ser inferior a ${centsToEuros(pago.importeCents).toFixed(
            2,
          )} €.`,
        );
      }

      const pagoActualizado: VentaPagoEnCurso = finalizacion.updatePago(
        pago.tipoPagoPublicId,
        pago.importeCents,
        entregadoCents,
      );

      this.error.set(null);
      this.finalizacion.set(finalizacion);

      inputElement.value = String(this.getPagoEntregadoEuros(pagoActualizado));
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido modificar la cantidad entregada.'));

      inputElement.value = String(this.getPagoEntregadoEuros(pago));
    }
  }

  /**
   * Elimina un medio de pago de la finalización.
   */
  removePago(tipoPagoPublicId: string): void {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (this.saving() || finalizacion === null) {
      return;
    }

    finalizacion.removePago(tipoPagoPublicId);

    if (this.tipoPagoActivoPublicId() === tipoPagoPublicId) {
      this.tipoPagoActivoPublicId.set(
        finalizacion.totalCents > 0 ? (this.tipoPagoEfectivo()?.publicId ?? null) : null,
      );
    }

    this.error.set(null);

    this.finalizacion.set(finalizacion);
  }

  /**
   * Indica si un tipo de pago ya forma parte
   * de la liquidación.
   */
  isTipoPagoAdded(tipoPago: TipoPago): boolean {
    const publicId: string | null = tipoPago.publicId;

    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (publicId === null || finalizacion === null) {
      return false;
    }

    return finalizacion.pagos.some(
      (pago: VentaPagoEnCurso): boolean => pago.tipoPagoPublicId === publicId,
    );
  }

  /**
   * Indica si un tipo de pago puede añadirse en el estado actual.
   *
   * Los medios de pago nunca están disponibles cuando la acción
   * seleccionada es crear una reserva.
   */
  canAddTipoPago(tipoPago: TipoPago): boolean {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    return (
      !this.saving() &&
      !this.accionEsReserva() &&
      finalizacion !== null &&
      !finalizacion.completa &&
      !this.isTipoPagoAdded(tipoPago)
    );
  }

  /**
   * Produce el snapshot económico definitivo y solicita
   * al workspace la persistencia de la venta.
   */
  private finalizeVenta(imprimirTicket: boolean): void {
    if (this.saving()) {
      return;
    }

    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (finalizacion === null || !finalizacion.completa) {
      return;
    }

    try {
      const resultado: VentaFinalizacionResultado = finalizacion.toResultado();

      this.error.set(null);

      this.finalizeEvent.emit({
        finalizacion: resultado,
        imprimirTicket,
      });
    } catch (error: unknown) {
      this.error.set(
        getErrorMessage(error, 'No se ha podido preparar la finalización de la venta.'),
      );
    }
  }

  executeSelectedAction(): void {
    if (!this.puedeEjecutarAccion()) {
      return;
    }

    switch (this.accion()) {
      case 'imprimir-ticket':
        this.finalizeVenta(true);

        return;

      case 'no-imprimir-ticket':
        this.finalizeVenta(false);

        return;

      case 'reserva':
        this.createReservaConTicket();

        return;

      case 'reserva-sin-ticket':
        this.createReservaSinTicket();

        return;

      case 'ticket-regalo':
      case 'factura':
      case 'email':
        return;
    }
  }

  /**
   * Solicita guardar la venta como reserva
   * e imprimir su comprobante.
   */
  createReservaConTicket(): void {
    if (this.saving() || this.reservaBlockedReason() !== null) {
      return;
    }

    this.reservaConTicketEvent.emit();
  }

  /**
   * Solicita guardar la venta actual como reserva
   * sin imprimir comprobante.
   */
  createReservaSinTicket(): void {
    if (this.saving() || this.reservaBlockedReason() !== null) {
      return;
    }

    this.reservaSinTicketEvent.emit();
  }

  /**
   * Cancela la finalización sin modificar VentaEnCurso.
   */
  cancel(): void {
    if (this.saving()) {
      return;
    }

    this.cancelEvent.emit();
  }

  /**
   * Sitúa el foco en el campo rápido de efectivo y selecciona
   * su contenido para poder sustituirlo inmediatamente.
   */
  private focusEfectivoInput(): void {
    const inputElement: HTMLInputElement | undefined = this.efectivoInput()?.nativeElement;

    if (inputElement === undefined) {
      return;
    }

    inputElement.focus();
    inputElement.select();
  }

  private getPagoEfectivo(): VentaPagoEnCurso | null {
    const finalizacion: VentaFinalizacionEnCurso | null = this.finalizacion();

    if (finalizacion === null) {
      return null;
    }

    return finalizacion.pagos.find((pago: VentaPagoEnCurso): boolean => pago.esEfectivo) ?? null;
  }

  private clearPagoEfectivo(finalizacion: VentaFinalizacionEnCurso): void {
    const pago: VentaPagoEnCurso | null = this.getPagoEfectivo();

    if (pago !== null) {
      finalizacion.removePago(pago.tipoPagoPublicId);
      this.finalizacion.set(finalizacion);
    }

    this.error.set(null);
  }

  /**
   * Activa el modo reserva.
   *
   * Descarta cualquier pago introducido, elimina la selección visual
   * de medios de pago y muestra el efectivo como cero. Una reserva
   * no debe conservar ningún estado económico de una venta.
   */
  private activateReservaMode(): void {
    this.finalizacion.set(new VentaFinalizacionEnCurso(this.totalCents()));

    this.tipoPagoActivoPublicId.set(null);
    this.setEfectivoInputValue('0');
  }

  /**
   * Activa nuevamente el modo venta después de haber seleccionado
   * una reserva.
   *
   * Se crea una finalización económica completamente nueva y, para
   * ventas positivas, Efectivo vuelve a quedar como medio inicial.
   */
  private activateVentaMode(): void {
    this.finalizacion.set(new VentaFinalizacionEnCurso(this.totalCents()));

    this.tipoPagoActivoPublicId.set(
      this.totalCents() > 0 ? (this.tipoPagoEfectivo()?.publicId ?? null) : null,
    );

    this.setEfectivoInputValue('');
  }

  /**
   * Cambia directamente el valor visible del campo rápido de efectivo.
   *
   * El input mantiene deliberadamente su propio valor de edición y no
   * usa un binding [value] para no interferir mientras el usuario escribe.
   */
  private setEfectivoInputValue(value: string): void {
    const inputElement: HTMLInputElement | undefined = this.efectivoInput()?.nativeElement;

    if (inputElement === undefined) {
      return;
    }

    inputElement.value = value;
  }
}
