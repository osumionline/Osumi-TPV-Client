export default interface ActualizarEmpleadoCommand {
  readonly nombre: string;
  readonly hasPassword: boolean;

  /**
   * Nueva contraseña.
   *
   * null conserva la contraseña existente cuando el
   * empleado ya dispone de una.
   */
  readonly password: string | null;

  readonly color: string;
  readonly permisos: readonly number[];
}
