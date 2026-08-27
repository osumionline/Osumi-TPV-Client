import type { TicketBaiEnvironment } from '@desktop-contracts/configuration/ticket-bai-environment.type';

export default interface TicketBaiConfig {
  readonly nif: string | null;
  readonly environment: TicketBaiEnvironment;
}
