export default interface ActualizarEmpleadoRecordCommand {
  readonly nombre: string;

  /**
   * Nuevo hash scrypt.
   *
   * null conserva la contraseña actualmente almacenada.
   */
  readonly passwordHash: string | null;

  readonly color: string;
  readonly permisos: readonly number[];
}
