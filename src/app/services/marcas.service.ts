import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type CrearMarcaCommand from '@desktop-contracts/marcas/crear-marca-command.interface';
import type MarcaInterface from '@desktop-contracts/marcas/marca.interface';
import Marca from '@model/marcas/marca.model';

@Service()
export default class MarcasService {
  private readonly marcasSignal: WritableSignal<readonly Marca[]> = signal<readonly Marca[]>([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly marcas: Signal<readonly Marca[]> = this.marcasSignal.asReadonly();
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
   * Crea una marca, refresca la colección global
   * y devuelve su instancia canónica.
   */
  async create(command: CrearMarcaCommand): Promise<Marca> {
    const createdMarca: MarcaInterface = await window.osumiDesktop.marcas.create(command);

    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    const marca: Marca = new Marca().fromInterface(createdMarca);

    this.marcasSignal.update((marcas: readonly Marca[]): readonly Marca[] =>
      [
        ...marcas.filter((item: Marca): boolean => item.publicId !== createdMarca.publicId),
        marca,
      ].sort((left: Marca, right: Marca): number =>
        left.nombre.localeCompare(right.nombre, 'es', {
          sensitivity: 'base',
        }),
      ),
    );
    this.loadedSignal.set(true);

    return marca;
  }

  clear(): void {
    this.marcasSignal.set([]);

    this.loadedSignal.set(false);
  }

  findById(id: number): Marca | null {
    return this.marcas().find((marca: Marca): boolean => marca.id === id) ?? null;
  }

  findByPublicId(publicId: string): Marca | null {
    return this.marcas().find((marca: Marca): boolean => marca.publicId === publicId) ?? null;
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestMarcas();

    return this.pendingRequest;
  }

  private async requestMarcas(): Promise<void> {
    try {
      const result: readonly MarcaInterface[] = await window.osumiDesktop.marcas.getAll();

      const marcas: readonly Marca[] = result.map((marca: MarcaInterface): Marca =>
        new Marca().fromInterface(marca),
      );

      this.marcasSignal.set(marcas);

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }
}
