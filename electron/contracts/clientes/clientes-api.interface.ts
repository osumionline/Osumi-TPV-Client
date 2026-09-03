import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type { ClienteEstadisticasInterface } from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';

export default interface ClientesApi {
  getAll(): Promise<readonly ClienteInterface[]>;

  create(command: CrearClienteCommand): Promise<ClienteInterface>;

  update(command: ActualizarClienteCommand): Promise<ClienteInterface>;

  getEstadisticas(publicId: string): Promise<ClienteEstadisticasInterface>;
}
