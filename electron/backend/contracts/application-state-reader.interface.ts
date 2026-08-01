import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';

export default interface ApplicationStateReader {
  getState(): Promise<ApplicationStateResult>;
}
