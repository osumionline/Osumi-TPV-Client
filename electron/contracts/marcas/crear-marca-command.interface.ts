export default interface CrearMarcaCommand {
  readonly nombre: string;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly web: string | null;
  readonly observaciones: string | null;
  readonly crearProveedor: boolean;

  /**
   * Identificador temporal del logo seleccionado,
   * si el alta debe incluir una imagen.
   *
   * La propiedad es opcional para mantener compatible
   * la creación rápida existente desde Artículos.
   */
  readonly logoStagingId?: string | null;
}
