export default interface ClienteFacturaEmailCommand {
  readonly clientePublicId: string;
  readonly facturaPublicId: string;
  readonly destinatario: string;
}
