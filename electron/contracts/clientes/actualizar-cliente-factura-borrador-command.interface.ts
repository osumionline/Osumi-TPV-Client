import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';

export default interface ActualizarClienteFacturaBorradorCommand extends CrearClienteFacturaBorradorCommand {
  readonly borradorPublicId: string;
}
