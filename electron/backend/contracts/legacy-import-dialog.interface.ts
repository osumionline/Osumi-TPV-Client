export default interface LegacyImportDialog {
  selectPackage(): Promise<string | null>;
}
