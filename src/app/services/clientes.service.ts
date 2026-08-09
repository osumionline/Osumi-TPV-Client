import type { Signal, WritableSignal } from '@angular/core';
import { Injectable, signal } from '@angular/core';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import Cliente from '@model/clientes/cliente.model';

@Injectable({
  providedIn: 'root',
})
export default class ClientesService {
  private readonly clientesSignal: WritableSignal<readonly Cliente[]> = signal<readonly Cliente[]>(
    [],
  );

  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly clientes: Signal<readonly Cliente[]> = this.clientesSignal.asReadonly();

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
    this.clientesSignal.set([]);

    this.loadedSignal.set(false);
  }

  findById(id: number): Cliente | null {
    return this.clientes().find((cliente: Cliente): boolean => cliente.id === id) ?? null;
  }

  findByPublicId(publicId: string): Cliente | null {
    return (
      this.clientes().find((cliente: Cliente): boolean => cliente.publicId === publicId) ?? null
    );
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestClientes();

    return this.pendingRequest;
  }

  private async requestClientes(): Promise<void> {
    try {
      const result: readonly ClienteInterface[] = await window.osumiDesktop.clientes.getAll();

      const clientes: readonly Cliente[] = result.map((cliente: ClienteInterface): Cliente =>
        new Cliente().fromInterface(cliente),
      );

      this.clientesSignal.set(clientes);

      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }
}
