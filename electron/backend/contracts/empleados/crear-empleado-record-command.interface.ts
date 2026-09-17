export default interface CrearEmpleadoRecordCommand {
  readonly nombre: string;

  /**
   * Hash scrypt de la contraseña.
   * null crea el empleado sin contraseña.
   */
  readonly passwordHash: string | null;

  /**
   * Color hexadecimal normalizado sin #.
   */
  readonly color: string;

  readonly permisos: readonly number[];
}
