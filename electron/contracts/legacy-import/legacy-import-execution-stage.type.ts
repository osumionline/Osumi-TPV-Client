type LegacyImportExecutionStage =
  | 'preparing-staging'
  | 'creating-schema'
  | 'registering-import'
  | 'reading-master-data'
  | 'importing-employees'
  | 'importing-payment-types'
  | 'importing-catalog'
  | 'validating-database'
  | 'completed';

export default LegacyImportExecutionStage;
