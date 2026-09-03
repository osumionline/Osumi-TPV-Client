import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';

export default interface ActualizarClienteCommand extends CrearClienteCommand {
  readonly publicId: string;
}
