export default interface CrearClienteFacturaBorradorCommand {
  readonly clientePublicId: string;
  readonly ventasPublicIds: readonly string[];
}
