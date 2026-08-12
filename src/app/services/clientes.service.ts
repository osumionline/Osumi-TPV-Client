import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import Cliente from '@model/clientes/cliente.model';

@Service()
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

  /**
   * Crea un cliente, recarga la colección global y devuelve
   * la instancia canónica incorporada al servicio.
   */
  async create(command: CrearClienteCommand): Promise<Cliente> {
    const createdCliente: ClienteInterface = await window.osumiDesktop.clientes.create(command);

    /*
     * Si existiese una lectura anterior todavía en curso, esperamos
     * a que termine antes de forzar nuestra recarga posterior.
     *
     * De esta manera evitamos que reload() reutilice una petición
     * iniciada antes de crear el cliente y que, por tanto, pudiera
     * no contener todavía el nuevo registro.
     */
    if (this.pendingRequest !== null) {
      await this.pendingRequest;
    }

    await this.reload();

    const cliente: Cliente | null = this.findByPublicId(createdCliente.publicId);

    if (cliente === null) {
      throw new Error(
        'El cliente se ha creado, pero no se ha podido recuperar después de actualizar la lista.',
      );
    }

    return cliente;
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
