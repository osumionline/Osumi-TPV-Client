export default interface ActualizarEmpleadoRecordCommand {
  readonly nombre: string;
  readonly hasPassword: boolean;

  /**
   * Nuevo hash scrypt.
   *
   * null conserva la contraseña cuando hasPassword=true
   * o la desactiva cuando hasPassword=false.
   */
  readonly passwordHash: string | null;

  readonly color: string;
  readonly permisos: readonly number[];
}
