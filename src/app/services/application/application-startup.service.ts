import type { Signal, WritableSignal } from '@angular/core';
import { computed, inject, Service, signal } from '@angular/core';
import type ApplicationStartupStatus from '@app/model/startup/application-startup-status.type';
import ProvinciasService from '@services/application/provincias.service';
import CategoriasService from '@services/articulos/categorias.service';
import ClientesService from '@services/clientes/clientes.service';
import MarcasService from '@services/compras/marcas.service';
import ProveedoresService from '@services/compras/proveedores.service';
import EmpleadosService from '@services/empleados/empleados.service';
import TiposPagoService from '@services/tipos-pago/tipos-pago.service';
import { getErrorMessage } from '@utils/error.utils';

@Service()
export default class ApplicationStartupService {
  private readonly marcasService: MarcasService = inject(MarcasService);
  private readonly proveedoresService: ProveedoresService = inject(ProveedoresService);
  private readonly empleadosService: EmpleadosService = inject(EmpleadosService);
  private readonly tiposPagoService: TiposPagoService = inject(TiposPagoService);
  private readonly clientesService: ClientesService = inject(ClientesService);
  private readonly categoriasService: CategoriasService = inject(CategoriasService);
  private readonly provinciasService: ProvinciasService = inject(ProvinciasService);

  private readonly statusSignal: WritableSignal<ApplicationStartupStatus> =
    signal<ApplicationStartupStatus>('idle');

  private readonly currentStepSignal: WritableSignal<string | null> = signal<string | null>(null);

  private readonly completedStepsSignal: WritableSignal<number> = signal<number>(0);

  private readonly totalStepsSignal: WritableSignal<number> = signal<number>(0);

  private readonly errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  private pendingRequest: Promise<void> | null = null;

  readonly status: Signal<ApplicationStartupStatus> = this.statusSignal.asReadonly();

  readonly currentStep: Signal<string | null> = this.currentStepSignal.asReadonly();

  readonly completedSteps: Signal<number> = this.completedStepsSignal.asReadonly();

  readonly totalSteps: Signal<number> = this.totalStepsSignal.asReadonly();

  readonly error: Signal<string | null> = this.errorSignal.asReadonly();

  readonly isLoading: Signal<boolean> = computed((): boolean => this.statusSignal() === 'loading');

  readonly isReady: Signal<boolean> = computed((): boolean => this.statusSignal() === 'ready');

  readonly hasError: Signal<boolean> = computed((): boolean => this.statusSignal() === 'error');

  readonly percentage: Signal<number> = computed((): number => {
    if (this.statusSignal() === 'ready') {
      return 100;
    }

    const totalSteps: number = this.totalStepsSignal();

    if (totalSteps === 0) {
      return 0;
    }

    return Math.round((this.completedStepsSignal() / totalSteps) * 100);
  });

  start(): Promise<void> {
    if (this.isReady()) {
      return Promise.resolve();
    }

    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.executeStartup();

    return this.pendingRequest;
  }

  private async executeStartup(): Promise<void> {
    this.statusSignal.set('loading');

    this.errorSignal.set(null);

    this.completedStepsSignal.set(0);

    try {
      await this.runStartupSteps();

      this.completedStepsSignal.set(this.totalStepsSignal());

      this.currentStepSignal.set('Carga inicial completada.');

      this.statusSignal.set('ready');
    } catch (error: unknown) {
      const message: string = getErrorMessage(error);

      this.errorSignal.set(message);

      this.statusSignal.set('error');

      throw new Error('No se ha podido completar la carga inicial de la aplicación.', {
        cause: error,
      });
    } finally {
      this.pendingRequest = null;
    }
  }

  private async runStartupSteps(): Promise<void> {
    this.totalStepsSignal.set(7);

    this.currentStepSignal.set('Cargando marcas…');
    await this.marcasService.load();
    this.completedStepsSignal.set(1);

    this.currentStepSignal.set('Cargando proveedores…');
    await this.proveedoresService.load();
    this.completedStepsSignal.set(2);

    this.currentStepSignal.set('Cargando empleados…');
    await this.empleadosService.load();
    this.completedStepsSignal.set(3);

    this.currentStepSignal.set('Cargando tipos de pago…');
    await this.tiposPagoService.load();
    this.completedStepsSignal.set(4);

    this.currentStepSignal.set('Cargando clientes…');
    await this.clientesService.load();
    this.completedStepsSignal.set(5);

    this.currentStepSignal.set('Cargando categorías…');
    await this.categoriasService.load();
    this.completedStepsSignal.set(6);

    this.currentStepSignal.set('Cargando provincias…');
    await this.provinciasService.load();
    this.completedStepsSignal.set(7);
  }
}
