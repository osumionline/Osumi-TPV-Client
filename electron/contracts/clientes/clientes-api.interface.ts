import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';

export default interface ClientesApi {
  getAll(): Promise<readonly ClienteInterface[]>;

  create(command: CrearClienteCommand): Promise<ClienteInterface>;
}
