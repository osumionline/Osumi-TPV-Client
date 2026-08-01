import type { ApplicationStateReason } from '@desktop-contracts/application/application-state-reason.type';
import type { ApplicationState } from '@desktop-contracts/application/application-state.type';

export default interface ApplicationStateResult {
  readonly state: ApplicationState;

  readonly reason: ApplicationStateReason;
}
