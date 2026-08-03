type LegacyImportExecutionStage =
  | 'preparing-staging'
  | 'creating-schema'
  | 'registering-import'
  | 'validating-database'
  | 'completed';

export default LegacyImportExecutionStage;
