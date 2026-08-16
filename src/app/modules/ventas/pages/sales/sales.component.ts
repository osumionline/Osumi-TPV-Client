import {
  Component,
  computed,
  inject,
  type OnInit,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import HeaderComponent from '@app/components/header/header.component';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ReservaInterface from '@desktop-contracts/reservas/reserva.interface';
import type Cliente from '@model/clientes/cliente.model';
import type Empleado from '@model/empleados/empleado.model';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import ClientSelectorComponent from '@modules/ventas/components/client-selector/client-selector.component';
import EmployeeSelectorComponent from '@modules/ventas/components/employee-selector/employee-selector.component';
import ReservationManagerComponent from '@modules/ventas/components/reservation-manager/reservation-manager.component';
import SaleWorkspaceComponent from '@modules/ventas/components/sale-workspace/sale-workspace.component';
import SalesTabsComponent from '@modules/ventas/components/sales-tabs/sales-tabs.component';
import { DialogService } from '@osumi/angular-tools';
import ClienteProteccionDatosPrintService from '@services/cliente-proteccion-datos-print.service';
import ClientesService from '@services/clientes.service';
import EmpleadosService from '@services/empleados.service';
import VentasContextService from '@services/ventas-context.service';
import VentasService from '@services/ventas.service';
import { getErrorMessage } from '@utils/error.utils';

interface PendingReservasLoad {
  readonly cliente: Cliente;
  readonly reservas: readonly ReservaInterface[];
}

/**
 * Página principal del módulo de ventas.
 */
@Component({
  selector: 'otpv-sales',
  templateUrl: './sales.component.html',
  styleUrl: './sales.component.scss',
  imports: [
    EmployeeSelectorComponent,
    HeaderComponent,
    MatButton,
    MatProgressSpinner,
    SalesTabsComponent,
    SaleWorkspaceComponent,
    ClientSelectorComponent,
    ReservationManagerComponent,
  ],
})
export default class SalesComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);
  readonly empleadosService: EmpleadosService = inject(EmpleadosService);
  readonly ventasContextService: VentasContextService = inject(VentasContextService);
  readonly ventasService: VentasService = inject(VentasService);
  readonly clientesService: ClientesService = inject(ClientesService);
  private readonly clienteProteccionDatosPrintService: ClienteProteccionDatosPrintService = inject(
    ClienteProteccionDatosPrintService,
  );

  readonly initializing: WritableSignal<boolean> = signal<boolean>(true);

  readonly selectingEmployee: WritableSignal<boolean> = signal<boolean>(false);

  readonly selectingClient: WritableSignal<boolean> = signal<boolean>(false);

  readonly managingReservas: WritableSignal<boolean> = signal<boolean>(false);

  private readonly pendingReservasLoad: WritableSignal<PendingReservasLoad | null> =
    signal<PendingReservasLoad | null>(null);

  readonly appName: Signal<string> = computed((): string => {
    const appData = this.ventasContextService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  /**
   * Refresca el contexto operativo y recupera el workspace existente al entrar en Ventas.
   */
  ngOnInit(): void {
    void this.initialize();
  }

  /**
   * Abre una caja y crea la primera venta cuando sea necesario.
   */
  async abrirCaja(): Promise<void> {
    try {
      await this.ventasContextService.abrirCaja();

      if (!this.ventasService.hasVentas()) {
        this.nuevaVenta();
      }
    } catch {
      return;
    }
  }

  /**
   * Inicia la creación de una nueva venta aplicando la política de selección de empleado.
   */
  nuevaVenta(): void {
    if (!this.ventasContextService.puedeVender()) {
      return;
    }

    const empleados: readonly Empleado[] = this.empleadosService.empleados();

    if (empleados.length === 0) {
      this.dialog.alert({
        title: 'Error',
        content: 'No existe ningún empleado disponible para crear una venta.',
      });

      return;
    }

    const appData = this.ventasContextService.appData();

    if (appData === null) {
      return;
    }

    if (!appData.empleados || empleados.length === 1) {
      this.ventasService.crearVenta(empleados[0]);

      return;
    }

    this.selectingEmployee.set(true);
  }

  /**
   * Crea una nueva venta con el empleado seleccionado.
   */
  /**
   * Crea la venta correspondiente con el empleado seleccionado.
   */
  selectEmpleado(empleado: Empleado): void {
    this.selectingEmployee.set(false);

    const pendingReservas: PendingReservasLoad | null = this.pendingReservasLoad();

    if (pendingReservas !== null) {
      this.pendingReservasLoad.set(null);

      this.createVentaDesdeReservas(empleado, pendingReservas);

      return;
    }

    this.ventasService.crearVenta(empleado);
  }

  /**
   * Cancela la selección de empleado sin crear una nueva venta.
   */
  cancelEmployeeSelection(): void {
    this.selectingEmployee.set(false);
    this.pendingReservasLoad.set(null);

    const ventaIdTemporal: string | null = this.ventasService.ventaActivaId();

    if (ventaIdTemporal !== null) {
      this.ventasService.setFocusTarget(ventaIdTemporal, {
        type: 'localizador',
      });
    }
  }

  /**
   * Abre el gestor global de reservas.
   */
  openReservas(): void {
    if (!this.ventasContextService.puedeVender()) {
      return;
    }

    this.managingReservas.set(true);
  }

  /**
   * Cierra el gestor y restaura el foco
   * de la venta que estuviera activa.
   */
  closeReservas(): void {
    this.managingReservas.set(false);

    const ventaIdTemporal: string | null = this.ventasService.ventaActivaId();

    if (ventaIdTemporal === null) {
      return;
    }

    this.ventasService.setFocusTarget(ventaIdTemporal, {
      type: 'localizador',
    });
  }

  /**
   * Prepara una nueva venta a partir de las
   * reservas elegidas en el gestor.
   */
  async loadReservas(reservas: readonly ReservaInterface[]): Promise<void> {
    if (reservas.length === 0) {
      return;
    }

    const primeraReserva: ReservaInterface = reservas[0]!;

    if (
      reservas.some(
        (reserva: ReservaInterface): boolean =>
          reserva.clientePublicId !== primeraReserva.clientePublicId ||
          reserva.idCliente !== primeraReserva.idCliente,
      )
    ) {
      this.dialog.alert({
        title: 'Error',
        content: 'Las reservas seleccionadas pertenecen a distintos clientes.',
      });

      return;
    }

    try {
      await this.clientesService.load();
    } catch {
      this.dialog.alert({
        title: 'Error',
        content: 'No se ha podido recuperar el cliente asociado a las reservas.',
      });

      return;
    }

    const cliente: Cliente | null = this.clientesService.findByPublicId(
      primeraReserva.clientePublicId,
    );

    if (cliente === null) {
      this.dialog.alert({
        title: 'Error',
        content: 'El cliente asociado a la reserva ya no está disponible.',
      });

      return;
    }

    const empleados: readonly Empleado[] = this.empleadosService.empleados();

    if (empleados.length === 0) {
      this.dialog.alert({
        title: 'Error',
        content: 'No existe ningún empleado disponible para cargar la reserva.',
      });

      return;
    }

    const appData: AppData | null = this.ventasContextService.appData();

    if (appData === null) {
      return;
    }

    const pending: PendingReservasLoad = {
      cliente,
      reservas,
    };

    /*
     * Cerramos el gestor antes de abrir una
     * nueva pestaña o el selector de empleado.
     */
    this.managingReservas.set(false);

    if (!appData.empleados || empleados.length === 1) {
      this.createVentaDesdeReservas(empleados[0]!, pending);

      return;
    }

    this.pendingReservasLoad.set(pending);

    this.selectingEmployee.set(true);
  }

  /**
   * Abre la selección de cliente para la venta activa.
   */
  openClientSelection(): void {
    const venta: VentaEnCurso | null = this.ventasService.ventaActiva();

    if (venta === null || venta.tieneReservas) {
      return;
    }

    this.selectingClient.set(true);
  }

  /**
   * Asigna el cliente seleccionado a la venta activa.
   */
  selectCliente(cliente: Cliente): void {
    const venta: VentaEnCurso | null = this.ventasService.ventaActiva();

    if (venta === null) {
      this.selectingClient.set(false);

      return;
    }

    this.ventasService.asignarCliente(venta.idTemporal, cliente);
    this.closeClientSelectionAndFocusLocalizador(venta.idTemporal);
  }

  /**
   * Asigna un cliente recién creado e inicia inmediatamente
   * la impresión de su documento de protección de datos.
   */
  createdCliente(cliente: Cliente): void {
    const appData = this.ventasContextService.appData();

    /*
     * La creación y selección del cliente no debe quedar condicionada
     * por que la impresión pueda abrirse correctamente.
     */
    this.selectCliente(cliente);

    if (appData === null) {
      this.dialog.alert({
        title: 'Aviso',
        content:
          'El cliente se ha creado correctamente, pero no se han podido obtener los datos de la empresa para imprimir el documento de protección de datos.',
      });

      return;
    }

    try {
      this.clienteProteccionDatosPrintService.print(appData, cliente);
    } catch (error: unknown) {
      const message: string = getErrorMessage(
        error,
        'No se ha podido imprimir el documento de protección de datos.',
      );

      this.dialog.alert({
        title: 'Aviso',
        content: `El cliente se ha creado correctamente, pero ${message}`,
      });
    }
  }

  /**
   * Quita el cliente asociado a la venta activa.
   */
  clearCliente(): void {
    const venta: VentaEnCurso | null = this.ventasService.ventaActiva();

    if (venta === null) {
      this.selectingClient.set(false);

      return;
    }

    this.ventasService.quitarCliente(venta.idTemporal);
    this.closeClientSelectionAndFocusLocalizador(venta.idTemporal);
  }

  /**
   * Cierra la selección de cliente sin modificar la venta.
   */
  cancelClientSelection(): void {
    this.closeClientSelectionAndFocusLocalizador(this.ventasService.ventaActivaId());
  }

  /**
   * Selecciona una venta abierta.
   */
  selectVenta(ventaIdTemporal: string): void {
    this.ventasService.seleccionarVenta(ventaIdTemporal);
  }

  /**
   * Confirma y cierra una venta sin persistirla.
   */
  cerrarVenta(ventaIdTemporal: string): void {
    const venta: VentaEnCurso | null = this.ventasService.findById(ventaIdTemporal);

    if (venta === null) {
      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content: `¿Estás seguro de querer cerrar la VENTA ${venta.numero}?`,
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        this.ventasService.cerrarVenta(ventaIdTemporal);
      });
  }

  /**
   * Cancela la venta activa después de solicitar confirmación.
   */
  cancelarVentaActiva(): void {
    const venta: VentaEnCurso | null = this.ventasService.ventaActiva();

    if (venta === null) {
      return;
    }

    this.cerrarVenta(venta.idTemporal);
  }

  /**
   * Cierra la selección de cliente y devuelve el foco al localizador
   * de la venta indicada.
   */
  private closeClientSelectionAndFocusLocalizador(ventaIdTemporal: string | null): void {
    this.selectingClient.set(false);

    if (ventaIdTemporal === null) {
      return;
    }

    this.ventasService.setFocusTarget(ventaIdTemporal, {
      type: 'localizador',
    });
  }

  /**
   * Crea materialmente una pestaña nueva a
   * partir de las reservas seleccionadas.
   */
  private createVentaDesdeReservas(empleado: Empleado, pending: PendingReservasLoad): void {
    try {
      this.ventasService.crearVentaDesdeReservas(empleado, pending.cliente, pending.reservas);
    } catch (error: unknown) {
      this.dialog.alert({
        title: 'Error',
        content: getErrorMessage(error, 'No se han podido cargar las reservas.'),
      });
    }
  }

  /**
   * Carga el contexto y crea una primera venta cuando la sesión todavía no tenía ninguna.
   */
  private async initialize(): Promise<void> {
    this.initializing.set(true);

    try {
      await this.ventasContextService.reload();

      if (this.ventasContextService.puedeVender() && !this.ventasService.hasVentas()) {
        this.nuevaVenta();
      }
    } finally {
      this.initializing.set(false);
    }
  }
}
