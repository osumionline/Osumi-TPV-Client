export default interface ActualizarClienteFacturaBorradorRecordCommand {
  readonly clientePublicId: string;
  readonly borradorPublicId: string;
  readonly ventasPublicIds: readonly string[];
}
