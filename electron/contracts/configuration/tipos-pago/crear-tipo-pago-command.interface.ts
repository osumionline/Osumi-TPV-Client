export default interface CrearTipoPagoCommand {
  readonly nombre: string;
  readonly afectaCaja: boolean;
  readonly fisico: boolean;
  readonly logoStagingId: string;
}
