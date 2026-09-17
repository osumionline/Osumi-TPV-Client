export default interface CrearEmpleadoCommand {
  readonly nombre: string;

  /**
   * Contraseña inicial obligatoria del empleado.
   */
  readonly password: string;

  readonly color: string;
  readonly permisos: readonly number[];
}
