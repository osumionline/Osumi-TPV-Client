type LegacyImportExecutionStage =
  | 'preparing-staging'
  | 'creating-schema'
  | 'registering-import'
  | 'reading-master-data'
  | 'importing-employees'
  | 'importing-payment-types'
  | 'importing-catalog'
  | 'reading-catalog'
  | 'validating-catalog'
  | 'normalizing-catalog'
  | 'importing-articles'
  | 'importing-barcodes'
  | 'importing-tags'
  | 'importing-expirations'
  | 'verifying-package-files'
  | 'extracting-files'
  | 'registering-files'
  | 'linking-files'
  | 'validating-database'
  | 'completed';

export default LegacyImportExecutionStage;
