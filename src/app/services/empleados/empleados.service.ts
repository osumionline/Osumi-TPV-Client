import type { Signal, WritableSignal } from '@angular/core';
import { computed, Service, signal } from '@angular/core';
import type ActualizarEmpleadoCommand from '@desktop-contracts/configuration/empleados/actualizar-empleado-command.interface';
import type AutenticarEmpleadoCommand from '@desktop-contracts/configuration/empleados/autenticar-empleado-command.interface';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type CrearEmpleadoCommand from '@desktop-contracts/configuration/empleados/crear-empleado-command.interface';
import type EmpleadoInterface from '@desktop-contracts/configuration/empleados/empleado.interface';
import Empleado from '@model/empleados/empleado.model';

@Service()
export default class EmpleadosService {
  private readonly empleadosSignal: WritableSignal<readonly Empleado[]> = signal<
    readonly Empleado[]
  >([]);

  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly empleados: Signal<readonly Empleado[]> = this.empleadosSignal.asReadonly();

  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

  readonly empleadoDefecto: Signal<Empleado | null> = computed((): Empleado | null => {
    const empleados: readonly Empleado[] = this.empleadosSignal();

    return empleados.length === 1 ? empleados[0] : null;
  });

  /**
   * Carga los empleados una única vez salvo
   * que ya estén disponibles en memoria.
   */
  load(): Promise<void> {
    if (this.loaded()) {
      return Promise.resolve();
    }

    return this.loadData();
  }

  /**
   * Fuerza una nueva carga del listado de empleados.
   */
  reload(): Promise<void> {
    return this.loadData();
  }

  /**
   * Limpia el estado de empleados en memoria.
   */
  clear(): void {
    this.empleadosSignal.set([]);
    this.loadedSignal.set(false);
  }

  /**
   * Comprueba las credenciales de un empleado
   * sin exponer información de autenticación.
   */
  authenticate(idEmpleado: number, password: string): Promise<AutenticarEmpleadoResult> {
    const command: AutenticarEmpleadoCommand = {
      idEmpleado,
      password,
    };

    return window.osumiDesktop.empleados.authenticate(command);
  }

  /**
   * Crea un empleado y actualiza inmediatamente
   * el listado mantenido en memoria.
   */
  async create(command: CrearEmpleadoCommand): Promise<Empleado> {
    const result: EmpleadoInterface = await window.osumiDesktop.empleados.create(command);

    const empleado: Empleado = this.toModel(result);

    this.upsertEmpleado(empleado);

    return empleado;
  }

  /**
   * Actualiza un empleado y sustituye inmediatamente
   * su representación mantenida en memoria.
   */
  async update(idEmpleado: number, command: ActualizarEmpleadoCommand): Promise<Empleado> {
    const result: EmpleadoInterface = await window.osumiDesktop.empleados.update(
      idEmpleado,
      command,
    );

    const empleado: Empleado = this.toModel(result);

    this.upsertEmpleado(empleado);

    return empleado;
  }

  /**
   * Da de baja un empleado y lo retira
   * inmediatamente del listado en memoria.
   */
  async deactivate(idEmpleado: number): Promise<void> {
    await window.osumiDesktop.empleados.deactivate(idEmpleado);

    this.empleadosSignal.update((empleados: readonly Empleado[]): readonly Empleado[] =>
      empleados.filter((empleado: Empleado): boolean => empleado.id !== idEmpleado),
    );
  }

  /**
   * Busca un empleado cargado por su id interno.
   */
  findById(id: number): Empleado | null {
    return this.empleados().find((empleado: Empleado): boolean => empleado.id === id) ?? null;
  }

  /**
   * Busca un empleado cargado por su publicId.
   */
  findByPublicId(publicId: string): Empleado | null {
    return (
      this.empleados().find((empleado: Empleado): boolean => empleado.publicId === publicId) ?? null
    );
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestEmpleados();

    return this.pendingRequest;
  }

  private async requestEmpleados(): Promise<void> {
    try {
      const result: readonly EmpleadoInterface[] = await window.osumiDesktop.empleados.getAll();

      const empleados: readonly Empleado[] = result.map((empleado: EmpleadoInterface): Empleado =>
        this.toModel(empleado),
      );

      this.empleadosSignal.set(this.sortEmpleados(empleados));

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }

  private upsertEmpleado(empleado: Empleado): void {
    this.empleadosSignal.update((current: readonly Empleado[]): readonly Empleado[] => {
      const exists: boolean = current.some((item: Empleado): boolean => item.id === empleado.id);

      const updated: readonly Empleado[] = exists
        ? current.map((item: Empleado): Empleado => (item.id === empleado.id ? empleado : item))
        : [...current, empleado];

      return this.sortEmpleados(updated);
    });
  }

  private sortEmpleados(empleados: readonly Empleado[]): readonly Empleado[] {
    return [...empleados].sort((first: Empleado, second: Empleado): number =>
      first.nombre.localeCompare(second.nombre, 'es', {
        sensitivity: 'base',
      }),
    );
  }

  private toModel(empleado: EmpleadoInterface): Empleado {
    return new Empleado().fromInterface(empleado);
  }
}
