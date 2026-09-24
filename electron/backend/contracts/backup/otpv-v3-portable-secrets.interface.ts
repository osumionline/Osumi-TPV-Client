export default interface OtpvV3PortableSecrets {
  readonly schemaVersion: 1;
  readonly secretApi: string;
  readonly emailSmtpPass: string | null;
  readonly ticketBaiToken: string | null;
}
