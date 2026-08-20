import { CdkDrag, CdkDragEnd, CdkDragHandle } from '@angular/cdk/drag-drop';
import { CurrencyPipe } from '@angular/common';
import {
  afterRenderEffect,
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
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { PERCENT_TOTAL } from '@constants/percentage.constants';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import permissionIds from '@desktop-contracts/permissions/permission-ids.constants';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import type VentaDevolucionInterface from '@desktop-contracts/ventas/venta-devolucion.interface';
import type TipoPago from '@model/tipos-pago/tipo-pago.model';
import type AccesoDirectoVenta from '@model/ventas/acceso-directo-venta.model';
import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import type VentaDevolucionSeleccion from '@model/ventas/venta-devolucion-seleccion.interface';
import type VentaDevolucionSelectorState from '@model/ventas/venta-devolucion-selector-state.interface';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import type VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import type VentaVariosData from '@model/ventas/venta-varios-data.interface';
import type VentaVariosEditorState from '@model/ventas/venta-varios-editor-state.interface';
import {
  getDefaultVariosIvaBps,
  getVariosIvaOptionsBps,
} from '@model/ventas/venta-varios-iva.utils';
import type {
  VentaEditableField,
  VentaFocusTarget,
  VentaWorkspaceState,
} from '@model/ventas/venta-workspace.interface';
import ArticleSearchComponent from '@modules/ventas/components/article-search/article-search.component';
import ClientStatisticsComponent from '@modules/ventas/components/client-statistics/client-statistics.component';
import DirectAccessSelectorComponent from '@modules/ventas/components/direct-access-selector/direct-access-selector.component';
import ReturnSelectorComponent from '@modules/ventas/components/return-selector/return-selector.component';
import SaleFinalizationComponent from '@modules/ventas/components/sale-finalization/sale-finalization.component';
import VariosEditorComponent from '@modules/ventas/components/varios-editor/varios-editor.component';
import { DialogService } from '@osumi/angular-tools';
import BpsToPercentPipe from '@pipes/bps-to-percent.pipe';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import MicrosToEurosPipe from '@pipes/micros-to-euros.pipe';
import ReservaTicketPrintService from '@services/reserva-ticket-print.service';
import ReservasService from '@services/reservas.service';
import VentasArticulosService from '@services/ventas-articulos.service';
import VentasContextService from '@services/ventas-context.service';
import VentasDevolucionesService from '@services/ventas-devoluciones.service';
import VentasService from '@services/ventas.service';
import { getErrorMessage } from '@utils/error.utils';
import { eurosToMicros, microsToEuros } from '@utils/money.utils';
import { bpsToPercent, percentToBps } from '@utils/percentage.utils';

/**
 * Muestra y gestiona la estructura visual de una venta abierta.
 */
@Component({
  selector: 'otpv-sale-workspace',
  templateUrl: './sale-workspace.component.html',
  styleUrl: './sale-workspace.component.scss',
  imports: [
    CdkDrag,
    CdkDragHandle,
    CurrencyPipe,
    MatButton,
    MatIcon,
    MatTooltip,
    ArticleSearchComponent,
    DirectAccessSelectorComponent,
    ClientStatisticsComponent,
    VariosEditorComponent,
    ReturnSelectorComponent,
    SaleFinalizationComponent,
    BpsToPercentPipe,
    CentsToEurosPipe,
    MicrosToEurosPipe,
  ],
})
export default class SaleWorkspaceComponent {
  private readonly dialog: DialogService = inject(DialogService);
  private readonly ventasArticulosService: VentasArticulosService = inject(VentasArticulosService);
  readonly ventasService: VentasService = inject(VentasService);
  private readonly ventasContextService: VentasContextService = inject(VentasContextService);
  private readonly ventasDevolucionesService: VentasDevolucionesService =
    inject(VentasDevolucionesService);
  private readonly reservasService: ReservasService = inject(ReservasService);
  private readonly reservaTicketPrintService: ReservaTicketPrintService =
    inject(ReservaTicketPrintService);

  readonly venta: InputSignal<VentaEnCurso> = input.required<VentaEnCurso>();

  /**
   * Expone la venta para la plantilla vinculando su renderizado
   * a las notificaciones de cambios de VentasService.
   *
   * VentaEnCurso es deliberadamente mutable durante la sesión,
   * por lo que una modificación interna puede conservar la misma
   * referencia del objeto.
   */
  readonly ventaView: Signal<VentaEnCurso> = computed(
    (): VentaEnCurso => {
      this.ventasService.ventas();

      return this.venta();
    },
    {
      equal: (): boolean => false,
    },
  );

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  /**
   * Informa al componente padre de que la operación actual
   * ha terminado correctamente y puede ser sustituida por
   * una nueva venta.
   */
  readonly completedEvent: OutputEmitterRef<string> = output<string>();

  readonly localizador: WritableSignal<string> = signal<string>('');

  readonly searching: WritableSignal<boolean> = signal<boolean>(false);

  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);

  readonly searchInitialQuery: WritableSignal<string> = signal<string>('');

  readonly directAccessOpen: WritableSignal<boolean> = signal<boolean>(false);

  readonly variosEditorState: WritableSignal<VentaVariosEditorState | null> =
    signal<VentaVariosEditorState | null>(null);

  readonly devolucionSelectorState: WritableSignal<VentaDevolucionSelectorState | null> =
    signal<VentaDevolucionSelectorState | null>(null);

  readonly finalizationOpen: WritableSignal<boolean> = signal<boolean>(false);

  readonly tiposPago: Signal<readonly TipoPago[]> = this.ventasContextService.tiposPago;

  readonly reservaSaving: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Explica por qué la venta actual no puede convertirse
   * en una nueva reserva.
   *
   * Esta validación mejora la UX del modal. El mapper de
   * Reservas continúa siendo la autoridad y vuelve a validar
   * las mismas precondiciones antes de persistir.
   */
  readonly reservaBlockedReason: Signal<string | null> = computed((): string | null => {
    const venta: VentaEnCurso = this.ventaView();
    const clientePublicId: string | null = venta.cliente?.publicId ?? null;

    if (clientePublicId === null) {
      return 'Para crear una reserva es obligatorio seleccionar un cliente.';
    }

    if (
      venta.devolucionOrigen !== null ||
      venta.lineas.some((linea: VentaLineaEnCurso): boolean => linea.esDevolucion)
    ) {
      return 'No se puede crear una reserva desde una venta que contiene devoluciones.';
    }

    if (
      venta.tieneReservas ||
      venta.lineas.some((linea: VentaLineaEnCurso): boolean => linea.esReserva)
    ) {
      return 'No se puede crear una nueva reserva desde una venta que ya procede de reservas.';
    }

    if (venta.lineas.length === 0) {
      return 'No se puede crear una reserva sin líneas.';
    }

    if (
      venta.lineas.some(
        (linea: VentaLineaEnCurso): boolean =>
          !Number.isSafeInteger(linea.cantidad) || linea.cantidad <= 0,
      )
    ) {
      return 'Las líneas de una reserva deben tener una cantidad positiva.';
    }

    return null;
  });

  readonly variosIvaOptionsBps: Signal<readonly number[]> = computed((): readonly number[] => {
    const appData: AppData | null = this.ventasContextService.appData();

    if (appData === null) {
      return [];
    }

    return getVariosIvaOptionsBps(appData.ivaList);
  });

  readonly localizadorInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('localizadorInput');
  readonly editableInputs: Signal<readonly ElementRef<HTMLInputElement>[]> =
    viewChildren<ElementRef<HTMLInputElement>>('editableInput');

  private readonly restoreFocusRef = afterRenderEffect({
    write: (): void => {
      const venta: VentaEnCurso = this.venta();
      const workspace: VentaWorkspaceState | null = this.ventasService.workspaceActivo();

      if (
        this.ventasService.ventaActivaId() !== venta.idTemporal ||
        workspace === null ||
        this.searchOpen() ||
        this.directAccessOpen() ||
        this.variosEditorState() !== null ||
        this.devolucionSelectorState() !== null ||
        this.finalizationOpen()
      ) {
        return;
      }

      const focusTarget: VentaFocusTarget = workspace.focusTarget;

      if (focusTarget.type === 'localizador') {
        const localizadorInput: ElementRef<HTMLInputElement> | undefined = this.localizadorInput();

        localizadorInput?.nativeElement.focus();

        return;
      }

      const editableInput: ElementRef<HTMLInputElement> | undefined = this.editableInputs().find(
        (input: ElementRef<HTMLInputElement>): boolean =>
          input.nativeElement.dataset['lineaIdTemporal'] === focusTarget.lineaIdTemporal &&
          input.nativeElement.dataset['field'] === focusTarget.field,
      );

      if (editableInput === undefined) {
        return;
      }

      editableInput.nativeElement.focus();
      editableInput.nativeElement.select();
    },
  });

  /**
   * Registra que el usuario está trabajando en el campo localizador.
   */
  onLocalizadorFocus(): void {
    this.ventasService.setFocusTarget(this.venta().idTemporal, {
      type: 'localizador',
    });
  }

  /**
   * Indica si un campo concreto de una línea se encuentra en edición.
   */
  isEditing(lineaIdTemporal: string, field: VentaEditableField): boolean {
    const workspace: VentaWorkspaceState | null = this.ventasService.getWorkspace(
      this.venta().idTemporal,
    );

    if (workspace?.focusTarget.type !== 'linea') {
      return false;
    }

    return (
      workspace.focusTarget.lineaIdTemporal === lineaIdTemporal &&
      workspace.focusTarget.field === field
    );
  }

  /**
   * Inicia la edición de un campo concreto de una línea.
   */
  editLinea(lineaIdTemporal: string, field: VentaEditableField): void {
    this.ventasService.setFocusTarget(this.venta().idTemporal, {
      type: 'linea',
      lineaIdTemporal,
      field,
    });
  }

  /**
   * Indica si el empleado actual puede modificar importes económicos directos.
   */
  canModifyAmounts(): boolean {
    const empleado = this.venta().empleado;

    if (empleado === null) {
      return false;
    }

    return empleado.admin || empleado.hasPerm(permissionIds.ventas.modificarImportes);
  }

  /**
   * Inicia la edición manual del importe de una línea.
   */
  editImporte(linea: VentaLineaEnCurso): void {
    if (!this.canModifyAmounts()) {
      return;
    }

    if (linea.regalo) {
      this.showLineEditBlocked(
        'La línea está marcada como regalo y no se puede modificar su importe.',
      );

      return;
    }

    if (linea.tieneDescuentoPromocional) {
      this.showLineEditBlocked(
        'La línea tiene un precio promocional. Debes retirar primero ese descuento para modificar su importe.',
      );

      return;
    }

    if (linea.descuentoDirectoMicros !== null) {
      this.showLineEditBlocked(
        'La línea tiene un descuento directo. Debes retirarlo antes de modificar su importe.',
      );

      return;
    }

    this.editLinea(linea.idTemporal, 'importe');
  }

  /**
   * Confirma el importe manual introducido para una línea.
   */
  commitImporte(linea: VentaLineaEnCurso, event: Event, returnToLocalizador: boolean): void {
    if (!this.isEditing(linea.idTemporal, 'importe')) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const inputValue: number = inputElement.valueAsNumber;

    if (Number.isNaN(inputValue) || inputValue < 0) {
      inputElement.value = String(microsToEuros(linea.importeFinalMicros));

      this.showLineOperationError(
        new RangeError('El importe debe ser mayor o igual que cero.'),
        linea.idTemporal,
        'importe',
      );

      return;
    }

    try {
      const importeManualMicros: number = eurosToMicros(inputValue);

      this.ventasService.establecerImporteManual(
        this.venta().idTemporal,
        linea.idTemporal,
        importeManualMicros,
      );
    } catch (error: unknown) {
      inputElement.value = String(microsToEuros(linea.importeFinalMicros));

      this.showLineOperationError(error, linea.idTemporal, 'importe');

      return;
    }

    if (returnToLocalizador) {
      this.focusLocalizador();
    }
  }

  /**
   * Retira el importe manual y recupera el cálculo normal de la línea.
   */
  clearImporteManual(linea: VentaLineaEnCurso, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.canModifyAmounts()) {
      return;
    }

    this.ventasService.quitarImporteManual(this.venta().idTemporal, linea.idTemporal);

    this.focusLocalizador();
  }

  /**
   * Inicia la edición del descuento porcentual de una línea.
   */
  editDescuentoPorcentaje(linea: VentaLineaEnCurso): void {
    if (linea.regalo) {
      this.showLineEditBlocked(
        'La línea está marcada como regalo y no se puede modificar su descuento.',
      );

      return;
    }

    if (linea.importeManualMicros !== null) {
      this.showLineEditBlocked(
        'La línea tiene un importe manual. Debes retirarlo antes de modificar su descuento.',
      );

      return;
    }

    if (linea.tieneDescuentoPromocional) {
      this.showLineEditBlocked(
        'La línea tiene un precio promocional. Debes retirarlo antes de aplicar un descuento porcentual.',
      );

      return;
    }

    if (linea.descuentoDirectoMicros !== null) {
      this.showLineEditBlocked(
        'La línea tiene un descuento directo. Debes retirarlo antes de aplicar un descuento porcentual.',
      );

      return;
    }

    this.editLinea(linea.idTemporal, 'descuento-porcentaje');
  }

  /**
   * Confirma el descuento porcentual introducido para una línea.
   */
  commitDescuentoPorcentaje(
    linea: VentaLineaEnCurso,
    event: Event,
    returnToLocalizador: boolean,
  ): void {
    if (!this.isEditing(linea.idTemporal, 'descuento-porcentaje')) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const inputValue: number = inputElement.valueAsNumber;

    const porcentaje: number = Number.isNaN(inputValue) ? 0 : inputValue;

    if (porcentaje < 0 || porcentaje > PERCENT_TOTAL) {
      inputElement.value = String(bpsToPercent(linea.descuentoBps));

      this.showLineOperationError(
        new RangeError(`El descuento debe estar comprendido entre 0 y ${PERCENT_TOTAL} %.`),
        linea.idTemporal,
        'descuento-porcentaje',
      );

      return;
    }

    const descuentoBps: number = percentToBps(porcentaje);

    try {
      const debeCrearDescuentoManual: boolean =
        linea.tieneDescuentoManual || descuentoBps !== linea.descuentoClienteBps;

      if (debeCrearDescuentoManual) {
        this.ventasService.establecerDescuentoPorcentaje(
          this.venta().idTemporal,
          linea.idTemporal,
          descuentoBps,
        );
      }
    } catch (error: unknown) {
      inputElement.value = String(bpsToPercent(linea.descuentoBps));

      this.showLineOperationError(error, linea.idTemporal, 'descuento-porcentaje');

      return;
    }

    if (returnToLocalizador) {
      this.focusLocalizador();
    }
  }

  /**
   * Retira el descuento porcentual manual y recupera
   * automáticamente la capa de descuento del cliente.
   */
  clearDescuentoPorcentajeManual(linea: VentaLineaEnCurso, event: MouseEvent): void {
    event.stopPropagation();

    this.ventasService.quitarDescuentoPorcentajeManual(this.venta().idTemporal, linea.idTemporal);

    this.focusLocalizador();
  }

  /**
   * Inicia la edición de un descuento directo expresado en euros.
   */
  editDescuentoDirecto(linea: VentaLineaEnCurso): void {
    if (!this.canModifyAmounts()) {
      return;
    }

    if (linea.regalo) {
      this.showLineEditBlocked(
        'La línea está marcada como regalo y no se puede modificar su descuento.',
      );

      return;
    }

    if (linea.importeManualMicros !== null) {
      this.showLineEditBlocked(
        'La línea tiene un importe manual. Debes retirarlo antes de aplicar un descuento directo.',
      );

      return;
    }

    if (linea.tieneDescuentoPromocional) {
      this.showLineEditBlocked(
        'La línea tiene un precio promocional. Debes retirarlo antes de aplicar un descuento directo.',
      );

      return;
    }

    this.editLinea(linea.idTemporal, 'descuento-importe');
  }

  /**
   * Confirma el descuento directo introducido para una línea.
   */
  commitDescuentoDirecto(
    linea: VentaLineaEnCurso,
    event: Event,
    returnToLocalizador: boolean,
  ): void {
    if (!this.isEditing(linea.idTemporal, 'descuento-importe')) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    const inputValue: number = inputElement.valueAsNumber;

    if (Number.isNaN(inputValue) || inputValue <= 0) {
      this.focusLocalizador();

      return;
    }

    try {
      const descuentoDirectoMicros: number = eurosToMicros(inputValue);

      this.ventasService.establecerDescuentoDirecto(
        this.venta().idTemporal,
        linea.idTemporal,
        descuentoDirectoMicros,
      );
    } catch (error: unknown) {
      inputElement.value =
        linea.descuentoDirectoMicros === null
          ? ''
          : String(microsToEuros(linea.descuentoDirectoMicros));

      this.showLineOperationError(error, linea.idTemporal, 'descuento-importe');

      return;
    }

    if (returnToLocalizador) {
      this.focusLocalizador();
    }
  }

  /**
   * Retira el descuento directo aplicado manualmente a una línea.
   */
  clearDescuentoDirecto(linea: VentaLineaEnCurso, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.canModifyAmounts()) {
      return;
    }

    this.ventasService.quitarDescuentoDirecto(this.venta().idTemporal, linea.idTemporal);

    this.focusLocalizador();
  }

  /**
   * Retira el precio promocional con el que el artículo entró en la venta.
   */
  clearDescuentoPromocional(linea: VentaLineaEnCurso, event: MouseEvent): void {
    event.stopPropagation();

    if (!this.canModifyAmounts()) {
      return;
    }

    this.ventasService.quitarDescuentoPromocional(this.venta().idTemporal, linea.idTemporal);

    this.focusLocalizador();
  }

  /**
   * Confirma la cantidad introducida para una línea.
   */
  commitCantidad(linea: VentaLineaEnCurso, event: Event, returnToLocalizador: boolean): void {
    if (!this.isEditing(linea.idTemporal, 'cantidad')) {
      return;
    }

    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const inputValue: number = inputElement.valueAsNumber;

    const cantidad: number = Number.isNaN(inputValue) || inputValue <= 0 ? 1 : inputValue;

    try {
      this.ventasService.cambiarCantidad(this.venta().idTemporal, linea.idTemporal, cantidad);
    } catch (error: unknown) {
      inputElement.value = String(linea.cantidad);
      this.showLineOperationError(error, linea.idTemporal, 'cantidad');

      return;
    }

    if (returnToLocalizador) {
      this.focusLocalizador();
    }
  }

  /**
   * Activa o desactiva el estado de regalo de una línea.
   */
  alternarRegalo(linea: VentaLineaEnCurso): void {
    this.ventasService.alternarRegalo(this.venta().idTemporal, linea.idTemporal);

    this.focusLocalizador();
  }

  /**
   * Actualiza el valor que se está introduciendo en el localizador.
   */
  onLocalizadorInput(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.localizador.set(inputElement.value);
  }

  /**
   * Interpreta las teclas del localizador y abre el buscador cuando comienza una búsqueda por nombre.
   */
  onLocalizadorKeydown(event: KeyboardEvent): void {
    if (/^\p{L}$/u.test(event.key) && !event.ctrlKey && !event.metaKey && !event.altKey) {
      event.preventDefault();

      this.openSearch(`${this.localizador()}${event.key}`);

      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      void this.resolveLocalizador();
    }
  }

  /**
   * Abre manualmente el selector de accesos directos.
   */
  openDirectAccess(): void {
    this.directAccessOpen.set(true);
  }

  /**
   * Añade los artículos elegidos en el buscador.
   */
  onSearchSelected(articulos: readonly ArticuloVenta[]): void {
    this.searchOpen.set(false);
    this.localizador.set('');

    this.ventasService.agregarArticulos(this.venta().idTemporal, articulos);
  }

  /**
   * Cierra el buscador y devuelve el foco al localizador.
   */
  closeSearch(): void {
    this.searchOpen.set(false);

    this.ventasService.setFocusTarget(this.venta().idTemporal, {
      type: 'localizador',
    });
  }

  /**
   * Resuelve el artículo asociado a un acceso directo.
   */
  onDirectAccessSelected(acceso: AccesoDirectoVenta): void {
    this.directAccessOpen.set(false);

    void this.resolveCode(String(acceso.accesoDirecto));
  }

  /**
   * Cierra el selector de accesos directos.
   */
  closeDirectAccess(): void {
    this.directAccessOpen.set(false);

    this.ventasService.setFocusTarget(this.venta().idTemporal, {
      type: 'localizador',
    });
  }

  /**
   * Abre el editor para introducir una nueva línea Varios.
   */
  openNewVarios(): void {
    this.localizador.set('');

    const appData: AppData | null = this.ventasContextService.appData();

    if (appData === null) {
      this.showVariosConfigurationError('No se ha podido obtener la configuración del negocio.');

      return;
    }

    let ivaBps: number;

    try {
      ivaBps = getDefaultVariosIvaBps(appData.ivaList);
    } catch (error: unknown) {
      this.showVariosConfigurationError(
        getErrorMessage(error, 'No se ha podido determinar el IVA del Varios.'),
      );

      return;
    }

    this.variosEditorState.set({
      lineaIdTemporal: null,
      data: {
        descripcion: 'Varios',
        pvpMicros: 0,
        ivaBps,
      },
    });
  }

  /**
   * Abre el editor con los datos actuales de una línea Varios.
   */
  openEditVarios(linea: VentaLineaEnCurso): void {
    if (!linea.esVarios) {
      return;
    }

    this.localizador.set('');

    this.variosEditorState.set({
      lineaIdTemporal: linea.idTemporal,
      data: {
        descripcion: linea.descripcion,
        pvpMicros: linea.pvpMicros,
        ivaBps: linea.ivaBps,
      },
    });
  }

  /**
   * Confirma la creación o edición del Varios activo.
   */
  onVariosSave(data: VentaVariosData): void {
    const editorState: VentaVariosEditorState | null = this.variosEditorState();

    if (editorState === null) {
      return;
    }

    try {
      if (editorState.lineaIdTemporal === null) {
        this.ventasService.agregarVarios(this.venta().idTemporal, data);
      } else {
        this.ventasService.actualizarVarios(
          this.venta().idTemporal,
          editorState.lineaIdTemporal,
          data,
        );
      }

      this.variosEditorState.set(null);
    } catch (error: unknown) {
      const message: string = getErrorMessage(
        error,
        editorState.lineaIdTemporal === null
          ? 'No se ha podido añadir el Varios.'
          : 'No se ha podido modificar el Varios.',
      );

      this.dialog
        .alert({
          title: 'Atención',
          content: message,
        })
        .subscribe();
    }
  }

  /**
   * Cancela la introducción del Varios sin crear ninguna línea.
   */
  closeVariosEditor(): void {
    this.variosEditorState.set(null);
    this.localizador.set('');

    this.focusLocalizador();
  }

  /**
   * Solicita la eliminación de una línea de la venta.
   */
  deleteLinea(linea: VentaLineaEnCurso): void {
    this.dialog
      .confirm({
        title: 'Confirmar',
        content: '¿Estás seguro de querer borrar esta línea?',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        this.ventasService.eliminarLinea(this.venta().idTemporal, linea.idTemporal);
        this.focusLocalizador();
      });
  }

  /**
   * Guarda la nueva posición del panel flotante del total.
   */
  onTotalDragEnded(event: CdkDragEnd): void {
    const position: { x: number; y: number } = event.source.getFreeDragPosition();

    this.ventasService.setTotalPosition(this.venta().idTemporal, position.x, position.y);
  }

  /**
   * Alterna la visibilidad de las estadísticas del cliente
   * conservando el estado en el workspace de la venta.
   */
  toggleClienteEstadisticas(): void {
    const workspace: VentaWorkspaceState | null = this.ventasService.getWorkspace(
      this.venta().idTemporal,
    );

    if (workspace === null) {
      return;
    }

    this.ventasService.setClienteEstadisticasExpanded(
      this.venta().idTemporal,
      !workspace.clienteEstadisticasExpanded,
    );

    this.focusLocalizador();
  }

  /**
   * Solicita cancelar por completo la venta en curso.
   */
  cancelVenta(): void {
    this.cancelEvent.emit();
  }

  /**
   * Abre una nueva finalización temporal para la venta actual.
   */
  openFinalization(): void {
    if (this.venta().lineas.length === 0) {
      return;
    }

    this.localizador.set('');
    this.finalizationOpen.set(true);
  }

  /**
   * Descarta la finalización temporal y devuelve
   * al usuario al flujo normal de venta.
   */
  closeFinalization(): void {
    this.finalizationOpen.set(false);
    this.localizador.set('');

    this.focusLocalizador();
  }

  /**
   * Persiste la venta como reserva e imprime
   * después su comprobante.
   */
  async createReservaConTicket(): Promise<void> {
    await this.createReserva(true);
  }

  /**
   * Persiste la venta como reserva sin imprimir
   * ningún comprobante.
   */
  async createReservaSinTicket(): Promise<void> {
    await this.createReserva(false);
  }

  /**
   * Orquesta la creación de una reserva y, opcionalmente,
   * su comprobante.
   *
   * La persistencia siempre ocurre antes de imprimir.
   */
  private async createReserva(imprimirTicket: boolean): Promise<void> {
    if (this.reservaSaving()) {
      return;
    }

    const blockedReason: string | null = this.reservaBlockedReason();

    if (blockedReason !== null) {
      this.dialog
        .alert({
          title: 'Reserva',
          content: blockedReason,
        })
        .subscribe();

      return;
    }

    const venta: VentaEnCurso = this.venta();

    this.reservaSaving.set(true);

    let reserva: ReservaInterface;

    try {
      reserva = await this.reservasService.createFromVenta(venta);
    } catch (error: unknown) {
      this.reservaSaving.set(false);

      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido crear la reserva.'),
        })
        .subscribe();

      return;
    }

    let printError: string | null = null;

    if (imprimirTicket) {
      const appData: AppData | null = this.ventasContextService.appData();

      if (appData === null) {
        printError = 'No se han podido obtener los datos del negocio para imprimir el comprobante.';
      } else {
        try {
          this.reservaTicketPrintService.print(appData, reserva);
        } catch (error: unknown) {
          printError = getErrorMessage(
            error,
            'No se ha podido imprimir el comprobante de reserva.',
          );
        }
      }
    }

    /*
     * A estas alturas la reserva ya existe y el stock
     * ya se encuentra inmovilizado.
     *
     * Un problema posterior de impresión nunca debe
     * permitir repetir accidentalmente la reserva.
     */
    this.reservaSaving.set(false);

    this.finalizationOpen.set(false);

    if (printError !== null) {
      this.dialog
        .alert({
          title: 'Aviso',
          content: `La reserva se ha creado correctamente, pero ha ocurrido un problema con la impresión: ${printError}`,
        })
        .subscribe();
    }

    this.completedEvent.emit(venta.idTemporal);
  }

  /**
   * Abre el buscador con el texto indicado.
   */
  private openSearch(query: string): void {
    this.searchInitialQuery.set(query);
    this.searchOpen.set(true);
  }

  /**
   * Resuelve el contenido actual del localizador.
   */
  private async resolveLocalizador(): Promise<void> {
    const codigo: string = this.localizador().trim();

    if (codigo.length === 0) {
      return;
    }

    if (codigo === '0') {
      this.openNewVarios();

      return;
    }

    if (/^-\d+$/.test(codigo)) {
      await this.resolveDevolucion(codigo);

      return;
    }

    await this.resolveCode(codigo);
  }

  /**
   * Recupera el ticket histórico asociado a un QR de devolución
   * y abre su selector de líneas.
   */
  private async resolveDevolucion(codigo: string): Promise<void> {
    this.localizador.set('');

    const idVenta: number = Number(codigo.substring(1));

    if (!Number.isSafeInteger(idVenta) || idVenta <= 0) {
      this.showDevolucionError('El código del ticket no es válido.');

      return;
    }

    if (this.venta().devolucionOrigen !== null) {
      this.showDevolucionError('Ya existe una devolución en curso en esta venta.');

      return;
    }

    this.searching.set(true);

    try {
      const devolucion: VentaDevolucionInterface | null =
        await this.ventasDevolucionesService.getDevolucion(idVenta);

      if (devolucion === null) {
        this.showDevolucionError('No se ha encontrado el ticket indicado.');

        return;
      }

      this.devolucionSelectorState.set({
        devolucion,
        seleccionInicial: [],
      });
    } catch (error: unknown) {
      this.showDevolucionError(getErrorMessage(error, 'No se ha podido recuperar el ticket.'));
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Vuelve a abrir la devolución que ya está incorporada
   * a la venta actual.
   */
  async openEditDevolucion(): Promise<void> {
    const origen = this.venta().devolucionOrigen;

    if (origen === null) {
      return;
    }

    this.localizador.set('');
    this.searching.set(true);

    try {
      const devolucion: VentaDevolucionInterface | null =
        await this.ventasDevolucionesService.getDevolucion(origen.id);

      if (devolucion === null) {
        this.showDevolucionError('No se ha podido recuperar el ticket original de la devolución.');

        return;
      }

      if (devolucion.publicId !== origen.publicId) {
        this.showDevolucionError('El ticket recuperado no coincide con la devolución en curso.');

        return;
      }

      const seleccionInicial: readonly VentaDevolucionSeleccion[] =
        this.buildDevolucionInitialSelection(devolucion);

      this.devolucionSelectorState.set({
        devolucion,
        seleccionInicial,
      });
    } catch (error: unknown) {
      this.showDevolucionError(getErrorMessage(error, 'No se ha podido recuperar la devolución.'));
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Reconstruye la selección actual de devolución utilizando
   * las líneas recién recuperadas del ticket histórico.
   */
  private buildDevolucionInitialSelection(
    devolucion: VentaDevolucionInterface,
  ): readonly VentaDevolucionSeleccion[] {
    const seleccion: VentaDevolucionSeleccion[] = [];

    for (const lineaVenta of this.venta().lineas) {
      if (!lineaVenta.esDevolucion) {
        continue;
      }

      const origen = lineaVenta.devolucionOrigen;

      if (origen === null) {
        throw new Error('Una línea de devolución no dispone de su referencia histórica.');
      }

      const lineaHistorica = devolucion.lineas.find((linea): boolean => linea.id === origen.id);

      if (lineaHistorica === undefined) {
        throw new Error('Una de las líneas de la devolución ya no existe en el ticket original.');
      }

      const unidades: number = lineaVenta.unidadesDevolucion;

      if (unidades > lineaHistorica.unidadesDisponibles) {
        throw new Error('La disponibilidad del ticket ha cambiado y la devolución debe revisarse.');
      }

      seleccion.push({
        linea: lineaHistorica,
        unidades,
      });
    }

    return seleccion;
  }

  /**
   * Incorpora o actualiza las líneas seleccionadas
   * de la devolución.
   */
  onDevolucionSelected(seleccion: readonly VentaDevolucionSeleccion[]): void {
    const selectorState: VentaDevolucionSelectorState | null = this.devolucionSelectorState();

    if (selectorState === null) {
      return;
    }

    try {
      this.ventasService.aplicarDevolucion(
        this.venta().idTemporal,
        selectorState.devolucion,
        seleccion,
      );

      this.devolucionSelectorState.set(null);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Atención',
          content: getErrorMessage(error, 'No se ha podido aplicar la devolución.'),
        })
        .subscribe();
    }
  }

  /**
   * Cierra el selector sin modificar la venta.
   */
  closeDevolucionSelector(): void {
    this.devolucionSelectorState.set(null);

    this.localizador.set('');

    this.focusLocalizador();
  }

  /**
   * Busca un artículo mediante el código indicado y lo añade a la venta.
   */
  private async resolveCode(codigo: string): Promise<void> {
    this.searching.set(true);

    try {
      const articulo: ArticuloVenta | null =
        await this.ventasArticulosService.resolveArticulo(codigo);

      if (articulo === null) {
        this.dialog
          .alert({
            title: 'Error',
            content: 'El código introducido no se encuentra.',
          })
          .subscribe((): void => {
            this.localizador.set('');

            this.ventasService.setFocusTarget(this.venta().idTemporal, {
              type: 'localizador',
            });
          });

        return;
      }

      this.localizador.set('');

      this.ventasService.agregarArticulos(this.venta().idTemporal, [articulo]);
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Informa temporalmente de una funcionalidad reservada para un bloque posterior.
   */
  private showPendingFeature(message: string): void {
    this.dialog
      .alert({
        title: 'Funcionalidad pendiente',
        content: message,
      })
      .subscribe((): void => {
        this.localizador.set('');

        this.ventasService.setFocusTarget(this.venta().idTemporal, {
          type: 'localizador',
        });
      });
  }

  /**
   * Informa de un problema con la configuración necesaria
   * para introducir un Varios.
   */
  private showVariosConfigurationError(message: string): void {
    this.dialog
      .alert({
        title: 'Atención',
        content: message,
      })
      .subscribe((): void => {
        this.focusLocalizador();
      });
  }

  /**
   * Informa de un problema al iniciar una devolución.
   */
  private showDevolucionError(message: string): void {
    this.dialog
      .alert({
        title: 'Atención',
        content: message,
      })
      .subscribe((): void => {
        this.focusLocalizador();
      });
  }

  /**
   * Devuelve el foco al localizador de la venta actual.
   */
  private focusLocalizador(): void {
    this.ventasService.setFocusTarget(this.venta().idTemporal, {
      type: 'localizador',
    });
  }

  /**
   * Muestra un error producido al modificar una línea y restaura su edición.
   */
  private showLineOperationError(
    error: unknown,
    lineaIdTemporal: string,
    field: VentaEditableField,
  ): void {
    const message: string = getErrorMessage(error, 'No se ha podido modificar la línea de venta.');

    this.dialog
      .alert({
        title: 'Atención',
        content: message,
      })
      .subscribe((): void => {
        this.ventasService.setFocusTarget(this.venta().idTemporal, {
          type: 'linea',
          lineaIdTemporal,
          field,
        });
      });
  }

  /**
   * Informa de que una modificación no está disponible para el estado actual de la línea.
   */
  private showLineEditBlocked(message: string): void {
    this.dialog
      .alert({
        title: 'Atención',
        content: message,
      })
      .subscribe((): void => {
        this.focusLocalizador();
      });
  }
}
