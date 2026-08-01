export default interface LegacyImportSelectionStore {
  save(packagePath: string): string;

  resolve(selectionId: string): string | null;

  clear(): void;
}
