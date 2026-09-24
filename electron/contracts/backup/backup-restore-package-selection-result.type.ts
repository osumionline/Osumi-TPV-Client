type BackupRestorePackageSelectionResult =
  | {
      readonly status: 'cancelled';
    }
  | {
      readonly status: 'selected';
      readonly mode: 'legacy-import';
      readonly selectionId: string;
      readonly formatVersion: 2;
      readonly fileName: string;
      readonly applicationVersion: string;
      readonly schemaVersion: string;
      readonly createdAt: string;
    }
  | {
      readonly status: 'selected';
      readonly mode: 'native-restore';
      readonly selectionId: string;
      readonly formatVersion: 3;
      readonly fileName: string;
      readonly backupId: string;
      readonly applicationVersion: string;
      readonly databaseSchemaVersion: number;
      readonly createdAt: string;
    };

export default BackupRestorePackageSelectionResult;
