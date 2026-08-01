export type ApplicationStateReason =
  | 'database-not-found'
  | 'orphaned-configuration'
  | 'configuration-not-found'
  | 'database-invalid'
  | 'ready';
