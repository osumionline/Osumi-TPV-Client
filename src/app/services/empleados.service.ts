import type { Signal, WritableSignal } from '@angular/core';
import { computed, Injectable, signal } from '@angular/core';
import type EmpleadoInterface from '@desktop-contracts/empleados/empleado.interface';
import Empleado from '@model/empleados/empleado.model';

@Injectable({
  providedIn: 'root',
})
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

  load(): Promise<void> {
    if (this.loaded()) {
      return Promise.resolve();
    }

    return this.loadData();
  }

  reload(): Promise<void> {
    return this.loadData();
  }

  clear(): void {
    this.empleadosSignal.set([]);
    this.loadedSignal.set(false);
  }

  findById(id: number): Empleado | null {
    return this.empleados().find((empleado: Empleado): boolean => empleado.id === id) ?? null;
  }

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
        new Empleado().fromInterface(empleado),
      );

      this.empleadosSignal.set(empleados);
      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }
}
