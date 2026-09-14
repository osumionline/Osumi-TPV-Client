import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type CrearProveedorCommand from '@desktop-contracts/proveedores/crear-proveedor-command.interface';
import type { ProveedorInterface } from '@desktop-contracts/proveedores/proveedor.interface';
import Proveedor from '@model/proveedores/proveedor.model';

@Service()
export default class ProveedoresService {
  private readonly proveedoresSignal: WritableSignal<readonly Proveedor[]> = signal<
    readonly Proveedor[]
  >([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly proveedores: Signal<readonly Proveedor[]> = this.proveedoresSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

  load(): Promise<void> {
    if (this.loaded()) {
      return Promise.resolve();
    }

    return this.loadData();
  }

  reload(): Promise<void> {
    return this.loadData();
  }

  /**
   * Crea un proveedor, refresca la colección global
   * y devuelve su instancia canónica.
   */
  async create(command: CrearProveedorCommand): Promise<Proveedor> {
    const createdProveedor: ProveedorInterface =
      await window.osumiDesktop.proveedores.create(command);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const proveedor: Proveedor = new Proveedor().fromInterface(createdProveedor);

    this.proveedoresSignal.update((proveedores: readonly Proveedor[]): readonly Proveedor[] =>
      [
        ...proveedores.filter(
          (item: Proveedor): boolean => item.publicId !== createdProveedor.publicId,
        ),
        proveedor,
      ].sort((left: Proveedor, right: Proveedor): number =>
        left.nombre.localeCompare(right.nombre, 'es', {
          sensitivity: 'base',
        }),
      ),
    );
    this.loadedSignal.set(true);

    return proveedor;
  }

  clear(): void {
    this.proveedoresSignal.set([]);

    this.loadedSignal.set(false);
  }

  findById(id: number): Proveedor | null {
    return this.proveedores().find((proveedor: Proveedor): boolean => proveedor.id === id) ?? null;
  }

  findByPublicId(publicId: string): Proveedor | null {
    return (
      this.proveedores().find((proveedor: Proveedor): boolean => proveedor.publicId === publicId) ??
      null
    );
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestProveedores();

    return this.pendingRequest;
  }

  private async requestProveedores(): Promise<void> {
    try {
      const result: readonly ProveedorInterface[] = await window.osumiDesktop.proveedores.getAll();

      const proveedores: readonly Proveedor[] = result.map(
        (proveedor: ProveedorInterface): Proveedor => new Proveedor().fromInterface(proveedor),
      );

      this.proveedoresSignal.set(proveedores);

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }
}
