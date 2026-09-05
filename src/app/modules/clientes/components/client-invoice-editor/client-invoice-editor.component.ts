import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OnDestroy,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatIcon } from '@angular/material/icon';
import type ActualizarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/actualizar-cliente-factura-borrador-command.interface';
import type {
  ClienteFacturaVentaDisponibleInterface,
  ClienteFacturaVentaInterface,
} from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';
import type EliminarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/eliminar-cliente-factura-borrador-command.interface';
import type { VentaHistoricoDetalle } from '@desktop-contracts/ventas/venta-historico.interface';
import HistoricalSaleDetailComponent from '@modules/ventas/components/historical-sale-detail/historical-sale-detail.component';
import { DialogService } from '@osumi/angular-tools';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import ClientesService from '@services/clientes.service';
import VentasHistoricoService from '@services/ventas-historico.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Edita un borrador de factura o consulta una
 * factura ya finalizada.
 */
@Component({
  selector: 'otpv-client-invoice-editor',
  templateUrl: './client-invoice-editor.component.html',
  styleUrl: './client-invoice-editor.component.scss',
  imports: [
    HistoricalSaleDetailComponent,
    CentsToEurosPipe,
    CurrencyPipe,
    DatePipe,
    MatButton,
    MatCheckbox,
    MatIcon,
    MatIconButton,
  ],
})
export default class ClientInvoiceEditorComponent implements OnInit, OnDestroy {
  private readonly clientesService: ClientesService = inject(ClientesService);
  private readonly ventasHistoricoService: VentasHistoricoService = inject(VentasHistoricoService);
  private readonly dialog: DialogService = inject(DialogService);

  readonly clientePublicId: InputSignal<string> = input.required<string>();
  readonly factura: InputSignal<ClienteFacturaInterface | null> =
    input<ClienteFacturaInterface | null>(null);

  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly currentFactura: WritableSignal<ClienteFacturaInterface | null> =
    signal<ClienteFacturaInterface | null>(null);
  readonly ventas: WritableSignal<readonly ClienteFacturaVentaInterface[]> = signal<
    readonly ClienteFacturaVentaInterface[]
  >([]);
  readonly selectedVentasPublicIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());
  readonly selectedVentaId: WritableSignal<number | null> = signal<number | null>(null);

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);
  readonly processing: WritableSignal<boolean> = signal<boolean>(false);
  readonly dialogOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly operationError: WritableSignal<string | null> = signal<string | null>(null);
  readonly operationInfo: WritableSignal<string | null> = signal<string | null>(null);
  readonly detalleLoading: WritableSignal<boolean> = signal<boolean>(false);
  readonly detalleError: WritableSignal<string | null> = signal<string | null>(null);
  readonly detalle: WritableSignal<VentaHistoricoDetalle | null> =
    signal<VentaHistoricoDetalle | null>(null);

  readonly editable: Signal<boolean> = computed((): boolean => {
    const factura: ClienteFacturaInterface | null = this.currentFactura();

    return factura === null || factura.estado === 'borrador';
  });

  readonly blocked: Signal<boolean> = computed(
    (): boolean => this.processing() || this.dialogOpen(),
  );

  readonly title: Signal<string> = computed((): string => {
    const factura: ClienteFacturaInterface | null = this.currentFactura();

    if (factura === null) {
      return 'Nueva factura';
    }

    if (factura.estado === 'borrador') {
      return 'Borrador de factura';
    }

    return factura.numeroFactura === null ? 'Factura' : `Factura ${factura.numeroFactura}`;
  });

  readonly hasChanges: Signal<boolean> = computed(
    (): boolean => !this.areSetsEqual(this.selectedVentasPublicIds(), this.baseVentasPublicIds()),
  );

  readonly selectedVentasCount: Signal<number> = computed(
    (): number => this.selectedVentasPublicIds().size,
  );

  readonly selectedTotalCents: Signal<number> = computed((): number => {
    if (!this.editable()) {
      return this.currentFactura()?.importeCents ?? 0;
    }

    const selectedPublicIds: ReadonlySet<string> = this.selectedVentasPublicIds();

    return this.ventas().reduce(
      (total: number, venta: ClienteFacturaVentaInterface): number =>
        selectedPublicIds.has(venta.publicId) ? total + venta.totalCents : total,
      0,
    );
  });

  readonly canSave: Signal<boolean> = computed(
    (): boolean =>
      this.editable() &&
      !this.loading() &&
      !this.blocked() &&
      this.selectedVentasCount() > 0 &&
      this.hasChanges(),
  );

  private readonly baseVentasPublicIds: WritableSignal<ReadonlySet<string>> = signal<
    ReadonlySet<string>
  >(new Set<string>());

  private loadRequestId: number = 0;
  private detailRequestId: number = 0;

  /**
   * Inicializa la factura y recupera sus ventas
   * o las ventas disponibles para editarla.
   */
  ngOnInit(): void {
    this.currentFactura.set(this.factura());

    void this.loadVentas();
  }

  /**
   * Invalida respuestas asíncronas cuando el modal
   * deja de existir.
   */
  ngOnDestroy(): void {
    this.loadRequestId++;
    this.detailRequestId++;
  }

  /**
   * Cierra directamente una factura limpia o solicita
   * confirmación cuando existen cambios sin guardar.
   */
  requestClose(): void {
    if (this.blocked()) {
      return;
    }

    if (!this.hasChanges()) {
      this.closeEvent.emit();

      return;
    }

    this.dialogOpen.set(true);

    this.dialog
      .confirm({
        title: 'Cambios sin guardar',
        content:
          'La factura contiene cambios sin guardar. ' + '¿Quieres cerrarla y perder esos cambios?',
      })
      .subscribe((result: boolean): void => {
        this.dialogOpen.set(false);

        if (result) {
          this.closeEvent.emit();
        }
      });
  }

  /**
   * Reintenta la carga inicial del editor.
   */
  retry(): void {
    if (this.blocked()) {
      return;
    }

    void this.loadVentas();
  }

  /**
   * Devuelve la referencia comercial visible de una venta.
   */
  getVentaReferencia(venta: ClienteFacturaVentaInterface): string {
    return `${venta.serie}${venta.numero}`;
  }

  /**
   * Construye el resumen compacto de tipos de pago.
   */
  getPagosLabel(venta: ClienteFacturaVentaInterface): string {
    if (venta.pagos.length === 0) {
      return 'Sin pago';
    }

    return venta.pagos.map((pago): string => pago.nombre).join(' + ');
  }

  /**
   * Indica si una venta forma parte de la selección editable.
   */
  isVentaSelected(publicId: string): boolean {
    return this.selectedVentasPublicIds().has(publicId);
  }

  /**
   * Añade o retira una venta de la factura editable.
   */
  toggleVenta(publicId: string): void {
    if (!this.editable() || this.blocked()) {
      return;
    }

    const selectedPublicIds: Set<string> = new Set<string>(this.selectedVentasPublicIds());

    if (selectedPublicIds.has(publicId)) {
      selectedPublicIds.delete(publicId);
    } else {
      selectedPublicIds.add(publicId);
    }

    this.selectedVentasPublicIds.set(selectedPublicIds);
    this.operationError.set(null);
    this.operationInfo.set(null);
  }

  /**
   * Selecciona una venta para mostrar su snapshot
   * histórico completo en el panel derecho.
   */
  selectVenta(idVenta: number): void {
    if (this.blocked()) {
      return;
    }

    if (
      this.selectedVentaId() === idVenta &&
      (this.detalleLoading() || this.detalle()?.id === idVenta)
    ) {
      return;
    }

    this.selectedVentaId.set(idVenta);
    this.detalle.set(null);
    this.detalleError.set(null);

    void this.loadDetalle(idVenta);
  }

  /**
   * Permite abrir el detalle de una venta mediante teclado.
   */
  selectVentaFromKeyboard(event: KeyboardEvent, idVenta: number): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.selectVenta(idVenta);
  }

  /**
   * Reintenta la carga del detalle activo.
   */
  retryDetalle(): void {
    const idVenta: number | null = this.selectedVentaId();

    if (idVenta === null || this.blocked()) {
      return;
    }

    void this.loadDetalle(idVenta);
  }

  /**
   * Crea o actualiza el borrador con la selección actual.
   */
  async save(): Promise<void> {
    if (!this.canSave()) {
      return;
    }

    const clientePublicId: string = this.clientePublicId();
    const ventasPublicIds: readonly string[] = this.getSelectedVentasPublicIds();
    const factura: ClienteFacturaInterface | null = this.currentFactura();

    this.processing.set(true);
    this.operationError.set(null);
    this.operationInfo.set(null);

    try {
      let persistedFactura: ClienteFacturaInterface;

      if (factura === null) {
        const command: CrearClienteFacturaBorradorCommand = {
          clientePublicId,
          ventasPublicIds,
        };

        persistedFactura = await this.clientesService.createFacturaBorrador(command);
      } else {
        const command: ActualizarClienteFacturaBorradorCommand = {
          clientePublicId,
          borradorPublicId: factura.publicId,
          ventasPublicIds,
        };

        persistedFactura = await this.clientesService.updateFacturaBorrador(command);
      }

      this.currentFactura.set(persistedFactura);
      this.setBaseSelection(this.selectedVentasPublicIds());
      this.operationInfo.set('Borrador guardado correctamente.');
    } catch (error: unknown) {
      this.operationError.set(
        getErrorMessage(error, 'No se ha podido guardar el borrador de factura.'),
      );
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Solicita confirmación antes de eliminar un
   * borrador ya persistido.
   */
  deleteBorrador(): void {
    const factura: ClienteFacturaInterface | null = this.currentFactura();

    if (
      this.blocked() ||
      factura === null ||
      factura.estado !== 'borrador' ||
      !factura.capacidades.puedeEliminar
    ) {
      return;
    }

    this.dialogOpen.set(true);

    this.dialog
      .confirm({
        title: 'Eliminar borrador',
        content:
          '¿Quieres eliminar este borrador de factura? ' +
          'Las ventas incluidas volverán a quedar disponibles para facturar.',
      })
      .subscribe((result: boolean): void => {
        this.dialogOpen.set(false);

        if (result) {
          void this.confirmDeleteBorrador(factura.publicId);
        }
      });
  }

  /**
   * Recupera las ventas adecuadas al estado actual
   * de la factura.
   */
  private async loadVentas(): Promise<void> {
    const requestId: number = ++this.loadRequestId;
    const factura: ClienteFacturaInterface | null = this.currentFactura();

    this.loading.set(true);
    this.loadError.set(null);
    this.ventas.set([]);
    this.selectedVentaId.set(null);
    this.detalle.set(null);
    this.detalleError.set(null);

    try {
      if (factura === null || factura.estado === 'borrador') {
        const ventas: readonly ClienteFacturaVentaDisponibleInterface[] =
          await this.clientesService.getFacturaVentasDisponibles({
            clientePublicId: this.clientePublicId(),
            borradorPublicId: factura?.publicId ?? null,
          });

        if (requestId !== this.loadRequestId) {
          return;
        }

        const selectedPublicIds: Set<string> = new Set<string>(
          ventas
            .filter(
              (venta: ClienteFacturaVentaDisponibleInterface): boolean => venta.incluidaEnBorrador,
            )
            .map((venta: ClienteFacturaVentaDisponibleInterface): string => venta.publicId),
        );

        this.ventas.set(ventas);
        this.selectedVentasPublicIds.set(selectedPublicIds);
        this.setBaseSelection(selectedPublicIds);

        return;
      }

      const ventas: readonly ClienteFacturaVentaInterface[] =
        await this.clientesService.getFacturaVentas({
          clientePublicId: this.clientePublicId(),
          facturaPublicId: factura.publicId,
        });

      if (requestId !== this.loadRequestId) {
        return;
      }

      const selectedPublicIds: Set<string> = new Set<string>(
        ventas.map((venta: ClienteFacturaVentaInterface): string => venta.publicId),
      );

      this.ventas.set(ventas);
      this.selectedVentasPublicIds.set(selectedPublicIds);
      this.setBaseSelection(selectedPublicIds);
    } catch (error: unknown) {
      if (requestId !== this.loadRequestId) {
        return;
      }

      this.loadError.set(
        getErrorMessage(error, 'No se han podido recuperar las ventas de la factura.'),
      );
    } finally {
      if (requestId === this.loadRequestId) {
        this.loading.set(false);
      }
    }
  }

  /**
   * Recupera el detalle histórico de la venta activa
   * protegiendo el modal frente a respuestas antiguas.
   */
  private async loadDetalle(idVenta: number): Promise<void> {
    const requestId: number = ++this.detailRequestId;

    this.detalleLoading.set(true);
    this.detalleError.set(null);

    try {
      const detalle: VentaHistoricoDetalle | null =
        await this.ventasHistoricoService.getDetalle(idVenta);

      if (requestId !== this.detailRequestId || this.selectedVentaId() !== idVenta) {
        return;
      }

      if (detalle === null) {
        this.detalle.set(null);
        this.detalleError.set('La venta seleccionada ya no se encuentra disponible.');

        return;
      }

      this.detalle.set(detalle);
    } catch (error: unknown) {
      if (requestId !== this.detailRequestId || this.selectedVentaId() !== idVenta) {
        return;
      }

      this.detalle.set(null);
      this.detalleError.set(
        getErrorMessage(error, 'No se ha podido recuperar el detalle de la venta.'),
      );
    } finally {
      if (requestId === this.detailRequestId && this.selectedVentaId() === idVenta) {
        this.detalleLoading.set(false);
      }
    }
  }

  /**
   * Elimina definitivamente el borrador lógico desde
   * el punto de vista del listado activo.
   */
  private async confirmDeleteBorrador(borradorPublicId: string): Promise<void> {
    this.processing.set(true);
    this.operationError.set(null);
    this.operationInfo.set(null);

    const command: EliminarClienteFacturaBorradorCommand = {
      clientePublicId: this.clientePublicId(),
      borradorPublicId,
    };

    try {
      await this.clientesService.deleteFacturaBorrador(command);
      this.closeEvent.emit();
    } catch (error: unknown) {
      this.operationError.set(
        getErrorMessage(error, 'No se ha podido eliminar el borrador de factura.'),
      );
    } finally {
      this.processing.set(false);
    }
  }

  /**
   * Devuelve los publicId seleccionados siguiendo
   * el mismo orden visible de las ventas.
   */
  private getSelectedVentasPublicIds(): readonly string[] {
    const selectedPublicIds: ReadonlySet<string> = this.selectedVentasPublicIds();

    return this.ventas()
      .filter((venta: ClienteFacturaVentaInterface): boolean =>
        selectedPublicIds.has(venta.publicId),
      )
      .map((venta: ClienteFacturaVentaInterface): string => venta.publicId);
  }

  /**
   * Establece la selección que representa el último
   * estado conocido como persistido.
   */
  private setBaseSelection(publicIds: ReadonlySet<string>): void {
    this.baseVentasPublicIds.set(new Set<string>(publicIds));
  }

  /**
   * Compara dos conjuntos de identificadores sin
   * depender de su orden de inserción.
   */
  private areSetsEqual(first: ReadonlySet<string>, second: ReadonlySet<string>): boolean {
    if (first.size !== second.size) {
      return false;
    }

    for (const value of first) {
      if (!second.has(value)) {
        return false;
      }
    }

    return true;
  }
}
