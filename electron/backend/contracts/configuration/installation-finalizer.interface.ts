export default interface InstallationFinalizer {
  recover(): Promise<void>;

  finalize(): Promise<void>;
}
