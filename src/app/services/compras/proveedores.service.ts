import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type ActualizarProveedorCommand from '@desktop-contracts/proveedores/actualizar-proveedor-command.interface';
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
   * Crea un proveedor, reconcilia el maestro global
   * y devuelve su instancia canónica.
   */
  async create(command: CrearProveedorCommand): Promise<Proveedor> {
    const createdProveedor: ProveedorInterface =
      await window.osumiDesktop.proveedores.create(command);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const proveedor: Proveedor = new Proveedor().fromInterface(createdProveedor);

    this.upsertProveedor(proveedor);
    this.loadedSignal.set(true);

    return proveedor;
  }

  /**
   * Actualiza un proveedor persistido, reconcilia el
   * maestro global y devuelve su instancia canónica.
   */
  async update(id: number, command: ActualizarProveedorCommand): Promise<Proveedor> {
    const updatedProveedor: ProveedorInterface = await window.osumiDesktop.proveedores.update(
      id,
      command,
    );

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const proveedor: Proveedor = new Proveedor().fromInterface(updatedProveedor);

    this.upsertProveedor(proveedor);
    this.loadedSignal.set(true);

    return proveedor;
  }

  /**
   * Da de baja un proveedor activo y lo elimina
   * inmediatamente del maestro renderer.
   */
  async deactivate(id: number): Promise<void> {
    await window.osumiDesktop.proveedores.deactivate(id);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    this.proveedoresSignal.update((proveedores: readonly Proveedor[]): readonly Proveedor[] =>
      proveedores.filter((proveedor: Proveedor): boolean => proveedor.id !== id),
    );
  }

  /**
   * Limpia completamente el maestro de Proveedores.
   */
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

  /**
   * Inserta o sustituye un Proveedor canónico en
   * el maestro global manteniendo el orden alfabético.
   */
  private upsertProveedor(proveedor: Proveedor): void {
    this.proveedoresSignal.update((proveedores: readonly Proveedor[]): readonly Proveedor[] =>
      [
        ...proveedores.filter((item: Proveedor): boolean => item.publicId !== proveedor.publicId),
        proveedor,
      ].sort((left: Proveedor, right: Proveedor): number =>
        left.nombre.localeCompare(right.nombre, 'es', {
          sensitivity: 'base',
        }),
      ),
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
