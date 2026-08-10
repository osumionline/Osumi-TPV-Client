import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
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
