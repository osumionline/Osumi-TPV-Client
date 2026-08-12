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
import permissionIds from '@desktop-contracts/permissions/permission-ids.constants';
import type AccesoDirectoVenta from '@model/ventas/acceso-directo-venta.model';
import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import type VentaLineaEnCurso from '@model/ventas/venta-linea-en-curso.model';
import type {
  VentaEditableField,
  VentaFocusTarget,
  VentaWorkspaceState,
} from '@model/ventas/venta-workspace.interface';
import { MICROS_PER_CENT } from '@model/ventas/ventas-money.constants';
import ArticleSearchComponent from '@modules/ventas/components/article-search/article-search.component';
import DirectAccessSelectorComponent from '@modules/ventas/components/direct-access-selector/direct-access-selector.component';
import { DialogService } from '@osumi/angular-tools';
import VentasArticulosService from '@services/ventas-articulos.service';
import VentasService from '@services/ventas.service';

/**
 * Muestra y gestiona la estructura visual de una venta abierta.
 */
@Component({
  selector: 'otpv-sale-workspace',
  templateUrl: './sale-workspace.component.html',
  styleUrl: './sale-workspace.component.scss',
  imports: [
    ArticleSearchComponent,
    CdkDrag,
    CdkDragHandle,
    CurrencyPipe,
    DirectAccessSelectorComponent,
    MatButton,
    MatIcon,
    MatTooltip,
  ],
})
export default class SaleWorkspaceComponent {
  private readonly dialog: DialogService = inject(DialogService);

  private readonly ventasArticulosService: VentasArticulosService = inject(VentasArticulosService);

  readonly ventasService: VentasService = inject(VentasService);

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

  readonly localizador: WritableSignal<string> = signal<string>('');

  readonly searching: WritableSignal<boolean> = signal<boolean>(false);

  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);

  readonly searchInitialQuery: WritableSignal<string> = signal<string>('');

  readonly directAccessOpen: WritableSignal<boolean> = signal<boolean>(false);

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
        this.directAccessOpen()
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
      inputElement.value = String(linea.importeFinalMicros / (100 * MICROS_PER_CENT));

      this.showLineOperationError(
        new RangeError('El importe debe ser mayor o igual que cero.'),
        linea.idTemporal,
        'importe',
      );

      return;
    }

    const importeManualMicros: number = Math.round(inputValue * 100) * MICROS_PER_CENT;

    try {
      this.ventasService.establecerImporteManual(
        this.venta().idTemporal,
        linea.idTemporal,
        importeManualMicros,
      );
    } catch (error: unknown) {
      inputElement.value = String(linea.importeFinalMicros / (100 * MICROS_PER_CENT));

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

    if (porcentaje < 0 || porcentaje > 100) {
      inputElement.value = String(linea.descuentoBps / 100);

      this.showLineOperationError(
        new RangeError('El descuento debe estar comprendido entre 0 y 100 %.'),
        linea.idTemporal,
        'descuento-porcentaje',
      );

      return;
    }

    const descuentoBps: number = Math.round(porcentaje * 100);

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
      inputElement.value = String(linea.descuentoBps / 100);

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

    const descuentoDirectoMicros: number = Math.round(inputValue * 100) * MICROS_PER_CENT;

    try {
      this.ventasService.establecerDescuentoDirecto(
        this.venta().idTemporal,
        linea.idTemporal,
        descuentoDirectoMicros,
      );
    } catch (error: unknown) {
      inputElement.value =
        linea.descuentoDirectoMicros === null
          ? ''
          : String(linea.descuentoDirectoMicros / (100 * MICROS_PER_CENT));

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
   * Solicita cancelar por completo la venta en curso.
   */
  cancelVenta(): void {
    this.cancelEvent.emit();
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
      this.showPendingFeature('La venta de artículos "Varios" se implementará en Ventas 7.');

      return;
    }

    if (/^-\d+$/.test(codigo)) {
      this.showPendingFeature('Las devoluciones se implementarán en Ventas 8.');

      return;
    }

    await this.resolveCode(codigo);
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
    const message: string =
      error instanceof Error ? error.message : 'No se ha podido modificar la línea de venta.';

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
