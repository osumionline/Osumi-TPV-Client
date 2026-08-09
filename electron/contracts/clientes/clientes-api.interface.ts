import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';

export default interface ClientesApi {
  getAll(): Promise<readonly ClienteInterface[]>;
}
