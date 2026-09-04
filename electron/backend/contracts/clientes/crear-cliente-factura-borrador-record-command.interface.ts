export default interface CrearClienteFacturaBorradorRecordCommand {
  readonly clientePublicId: string;
  readonly ventasPublicIds: readonly string[];
}
