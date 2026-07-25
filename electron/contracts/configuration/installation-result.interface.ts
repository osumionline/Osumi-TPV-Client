export type InstallationResultStatus = 'validated' | 'prepared' | 'installed' | 'error';

export interface InstallationValidationError {
  readonly field: string;
  readonly message: string;
}

export interface InstallationResult {
  readonly status: InstallationResultStatus;
  readonly message: string;
  readonly validationErrors: readonly InstallationValidationError[];
}
