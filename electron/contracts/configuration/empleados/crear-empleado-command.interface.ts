export default interface CrearEmpleadoCommand {
  readonly nombre: string;
  readonly hasPassword: boolean;

  /**
   * Contraseña inicial.
   *
   * Debe ser null cuando el empleado no usa contraseña.
   */
  readonly password: string | null;

  readonly color: string;
  readonly permisos: readonly number[];
}
