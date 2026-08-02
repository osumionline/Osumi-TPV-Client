import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';

export default interface ApplicationApi {
  getState(): Promise<ApplicationStateResult>;
}
