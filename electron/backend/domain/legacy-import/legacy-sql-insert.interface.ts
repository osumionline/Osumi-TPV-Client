export default interface LegacySqlInsert {
  readonly tableName: string;

  readonly values: ReadonlyMap<string, string | null>;
}
