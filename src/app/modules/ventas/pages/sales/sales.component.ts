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
import type Empleado from '@model/empleados/empleado.model';
import type VentaEnCurso from '@model/ventas/venta-en-curso.model';
import EmployeeSelectorComponent from '@modules/ventas/components/employee-selector/employee-selector.component';
import SaleWorkspaceComponent from '@modules/ventas/components/sale-workspace/sale-workspace.component';
import SalesTabsComponent from '@modules/ventas/components/sales-tabs/sales-tabs.component';
import { DialogService } from '@osumi/angular-tools';
import EmpleadosService from '@services/empleados.service';
import VentasContextService from '@services/ventas-context.service';
import VentasService from '@services/ventas.service';

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
  ],
})
export default class SalesComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);

  readonly empleadosService: EmpleadosService = inject(EmpleadosService);

  readonly ventasContextService: VentasContextService = inject(VentasContextService);

  readonly ventasService: VentasService = inject(VentasService);

  readonly initializing: WritableSignal<boolean> = signal<boolean>(true);

  readonly selectingEmployee: WritableSignal<boolean> = signal<boolean>(false);

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
  selectEmpleado(empleado: Empleado): void {
    this.selectingEmployee.set(false);
    this.ventasService.crearVenta(empleado);
  }

  /**
   * Cancela la selección de empleado sin crear una nueva venta.
   */
  cancelEmployeeSelection(): void {
    this.selectingEmployee.set(false);
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
