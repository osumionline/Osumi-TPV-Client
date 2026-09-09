export interface ClientSalesPeriod {
  readonly desde: string;
  readonly hasta: string;
}

export type ClientSaleOperationType = 'reprint' | 'email';

export interface ClientSaleOperation {
  readonly type: ClientSaleOperationType;
  readonly ventaId: number;
}
