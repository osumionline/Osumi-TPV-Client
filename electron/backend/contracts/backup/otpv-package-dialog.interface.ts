export default interface OtpvPackageDialog {
  /**
   * Permite seleccionar un paquete `.otpv`.
   *
   * Devuelve null cuando el usuario cancela.
   */
  selectPackage(): Promise<string | null>;
}
