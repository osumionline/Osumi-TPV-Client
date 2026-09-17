export default interface LegacyImportPhaseResult {
  readonly importedRows: number;
  readonly skippedRows: number;
  readonly warningCount: number;

  /**
   * Número de empleados legacy a los que se ha
   * asignado la contraseña por defecto.
   *
   * Solo lo informa la fase que importa empleados.
   */
  readonly defaultedEmployeePasswords?: number;
}
