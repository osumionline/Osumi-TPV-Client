export default interface CrearEmpleadoRecordCommand {
  readonly nombre: string;

  /**
   * Hash scrypt de la contraseña obligatoria.
   */
  readonly passwordHash: string;

  /**
   * Color hexadecimal normalizado sin #.
   */
  readonly color: string;

  readonly permisos: readonly number[];
}
