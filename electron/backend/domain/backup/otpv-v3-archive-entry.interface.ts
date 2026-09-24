export default interface OtpvV3ArchiveEntry {
  readonly path: string;
  readonly uncompressedSize: number;
  readonly isDirectory: boolean;
  readonly isSymbolicLink: boolean;
}
