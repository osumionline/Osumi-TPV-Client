export default interface EmailSmtpConfig {
  readonly host: string | null;
  readonly port: number | null;
  readonly secure: string | null;
  readonly user: string | null;
}