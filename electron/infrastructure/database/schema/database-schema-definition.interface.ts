export default interface DatabaseSchemaDefinition {
  readonly name: string;

  readonly statements: readonly string[];
}
