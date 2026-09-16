export default interface LegacyPasswordVerifier {
  /**
   * Comprueba una contraseña contra un hash procedente
   * de una instalación legacy.
   */
  verify(password: string, encodedHash: string): Promise<boolean>;
}
