export default interface EmpleadoAuthenticationRecord {
  readonly id: number;
  readonly passwordHash: string;
  readonly passwordAlgorithm: 'scrypt' | 'bcrypt_legacy';
  readonly passwordAvailable: boolean;
}
