import type { DatabaseCreationOptions } from '@backend/domain/database/database-creation-options.interface';
import {
  DATABASE_APPLICATION_ID,
  DATABASE_MINIMUM_SQLITE_VERSION,
  DATABASE_SCHEMA_VERSION,
} from '@backend/domain/database/database-schema.constants';
import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import type { QueryRunner } from 'typeorm';

interface SqliteVersionRow {
  readonly version: string;
}

interface DatabaseTableCountRow {
  readonly count: number;
}

interface DatabaseTableRow {
  readonly name: string;
}

interface IntegrityCheckRow {
  readonly integrity_check: string;
}

interface ForeignKeyCheckRow {
  readonly table: string;
  readonly rowid: number | null;
  readonly parent: string;
  readonly fkid: number;
}

interface ForeignKeysPragmaRow {
  readonly foreign_keys: number;
}

interface ApplicationIdPragmaRow {
  readonly application_id: number;
}

interface UserVersionPragmaRow {
  readonly user_version: number;
}

interface ApplicationMetadataRow {
  readonly schema_version: number;
  readonly application_version: string;
  readonly installation_type: string;
  readonly created_at: string;
  readonly imported_at: string | null;
}

export default class DatabaseSchemaService {
  constructor(
    private readonly definitions: readonly DatabaseSchemaDefinition[],

    private readonly expectedTables: readonly string[],
  ) {}

  async create(queryRunner: QueryRunner, options: DatabaseCreationOptions): Promise<void> {
    await this.configureConnection(queryRunner);

    await this.assertCompatibleSqliteVersion(queryRunner);

    await this.assertEmptyDatabase(queryRunner);

    await queryRunner.query(
      `PRAGMA application_id =
        ${DATABASE_APPLICATION_ID}`,
    );

    await queryRunner.startTransaction();

    try {
      await this.createDefinitions(queryRunner);

      await this.insertMetadata(queryRunner, options);

      await queryRunner.query(
        `PRAGMA user_version =
          ${DATABASE_SCHEMA_VERSION}`,
      );

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw error;
    }

    await this.validate(queryRunner);
  }

  async validate(queryRunner: QueryRunner): Promise<void> {
    await this.assertForeignKeysEnabled(queryRunner);

    await this.assertDatabaseIdentity(queryRunner);

    await this.assertExpectedTables(queryRunner);

    await this.assertApplicationMetadata(queryRunner);

    await this.assertIntegrity(queryRunner);

    await this.assertForeignKeyIntegrity(queryRunner);
  }

  private async configureConnection(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('PRAGMA foreign_keys = ON');

    await queryRunner.query('PRAGMA busy_timeout = 5000');
  }

  private async assertCompatibleSqliteVersion(queryRunner: QueryRunner): Promise<void> {
    const rows: SqliteVersionRow[] = (await queryRunner.query(
      `
          SELECT
            sqlite_version() AS version
        `,
    )) as SqliteVersionRow[];

    const currentVersion: string | undefined = rows[0]?.version;

    if (
      currentVersion === undefined ||
      !this.isVersionAtLeast(currentVersion, DATABASE_MINIMUM_SQLITE_VERSION)
    ) {
      throw new Error(
        [
          'La versión de SQLite no es compatible.',
          `Versión mínima: ${DATABASE_MINIMUM_SQLITE_VERSION}.`,
          `Versión detectada: ${currentVersion ?? 'desconocida'}.`,
        ].join(' '),
      );
    }
  }

  private async assertEmptyDatabase(queryRunner: QueryRunner): Promise<void> {
    const rows: DatabaseTableCountRow[] = (await queryRunner.query(
      `
          SELECT
            COUNT(*) AS count
          FROM sqlite_schema
          WHERE
            type = 'table'
            AND name NOT LIKE 'sqlite_%'
        `,
    )) as DatabaseTableCountRow[];

    const tableCount: number = rows[0]?.count ?? 0;

    if (tableCount > 0) {
      throw new Error('La base de datos no está vacía.');
    }
  }

  private async createDefinitions(queryRunner: QueryRunner): Promise<void> {
    for (const definition of this.definitions) {
      for (
        let statementIndex: number = 0;
        statementIndex < definition.statements.length;
        statementIndex++
      ) {
        const statement: string | undefined = definition.statements[statementIndex];

        if (statement === undefined) {
          throw new Error(
            [
              'No se ha encontrado una sentencia del esquema.',
              `Dominio: ${definition.name}.`,
              `Índice: ${statementIndex}.`,
            ].join(' '),
          );
        }

        try {
          await queryRunner.query(statement);
        } catch (error: unknown) {
          const errorMessage: string = error instanceof Error ? error.message : String(error);

          const statementDescription: string = this.getStatementDescription(statement);

          const numberedStatement: string = this.addSqlLineNumbers(statement);

          console.error(
            [
              '',
              '========================================',
              'ERROR CREANDO EL ESQUEMA SQLITE',
              '========================================',
              `Dominio: ${definition.name}`,
              `Sentencia: ${statementIndex + 1}/${definition.statements.length}`,
              `Objeto: ${statementDescription}`,
              `Error SQLite: ${errorMessage}`,
              '',
              'SQL ejecutado:',
              numberedStatement,
              '========================================',
            ].join('\n'),
          );

          throw new Error(
            [
              'No se ha podido crear el esquema SQLite.',
              `Dominio: ${definition.name}.`,
              `Sentencia: ${statementIndex + 1}/${definition.statements.length}.`,
              `Objeto: ${statementDescription}.`,
              `Error: ${errorMessage}`,
            ].join(' '),
            {
              cause: error,
            },
          );
        }
      }
    }
  }

  private getStatementDescription(statement: string): string {
    const normalizedStatement: string = statement.replace(/\s+/g, ' ').trim();

    const match: RegExpMatchArray | null = normalizedStatement.match(
      /^CREATE\s+(?:UNIQUE\s+)?(TABLE|INDEX|TRIGGER)\s+(?:IF\s+NOT\s+EXISTS\s+)?([^\s(]+)/i,
    );

    if (match === null) {
      return normalizedStatement.slice(0, 100);
    }

    const objectType: string = match[1]?.toUpperCase() ?? 'OBJETO';

    const objectName: string = match[2] ?? 'desconocido';

    return `${objectType} ${objectName}`;
  }

  private addSqlLineNumbers(statement: string): string {
    const lines: string[] = statement.trim().split('\n');

    return lines
      .map((line: string, index: number): string => {
        const lineNumber: string = String(index + 1).padStart(3, ' ');

        return `${lineNumber} | ${line}`;
      })
      .join('\n');
  }

  private async insertMetadata(
    queryRunner: QueryRunner,
    options: DatabaseCreationOptions,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO application_metadata (
          id,
          schema_version,
          application_version,
          installation_type,
          created_at,
          imported_at
        )
        VALUES (
          1,
          ?,
          ?,
          ?,
          ?,
          ?
        )
      `,
      [
        DATABASE_SCHEMA_VERSION,
        options.applicationVersion,
        options.installationType,
        options.createdAt,
        options.importedAt,
      ],
    );
  }

  private async assertForeignKeysEnabled(queryRunner: QueryRunner): Promise<void> {
    const rows: ForeignKeysPragmaRow[] = (await queryRunner.query(
      'PRAGMA foreign_keys',
    )) as ForeignKeysPragmaRow[];

    const enabled: number = rows[0]?.foreign_keys ?? 0;

    if (enabled !== 1) {
      throw new Error('Las claves foráneas de SQLite no están activadas.');
    }
  }

  private async assertDatabaseIdentity(queryRunner: QueryRunner): Promise<void> {
    const applicationIdRows: ApplicationIdPragmaRow[] = (await queryRunner.query(
      'PRAGMA application_id',
    )) as ApplicationIdPragmaRow[];

    const applicationId: number = applicationIdRows[0]?.application_id ?? 0;

    if (applicationId !== DATABASE_APPLICATION_ID) {
      throw new Error(
        [
          'El identificador de la base no es válido.',
          `Esperado: ${DATABASE_APPLICATION_ID}.`,
          `Encontrado: ${applicationId}.`,
        ].join(' '),
      );
    }

    const userVersionRows: UserVersionPragmaRow[] = (await queryRunner.query(
      'PRAGMA user_version',
    )) as UserVersionPragmaRow[];

    const userVersion: number = userVersionRows[0]?.user_version ?? 0;

    if (userVersion !== DATABASE_SCHEMA_VERSION) {
      throw new Error(
        [
          'La versión del esquema no es válida.',
          `Esperada: ${DATABASE_SCHEMA_VERSION}.`,
          `Encontrada: ${userVersion}.`,
        ].join(' '),
      );
    }
  }

  private async assertExpectedTables(queryRunner: QueryRunner): Promise<void> {
    const rows: DatabaseTableRow[] = (await queryRunner.query(
      `
          SELECT
            name
          FROM sqlite_schema
          WHERE
            type = 'table'
            AND name NOT LIKE 'sqlite_%'
          ORDER BY name
        `,
    )) as DatabaseTableRow[];

    const actualTables: string[] = rows.map((row: DatabaseTableRow): string => row.name).sort();

    const expectedTables: string[] = [...this.expectedTables].sort();

    const missingTables: string[] = expectedTables.filter(
      (tableName: string): boolean => !actualTables.includes(tableName),
    );

    const unexpectedTables: string[] = actualTables.filter(
      (tableName: string): boolean => !expectedTables.includes(tableName),
    );

    if (missingTables.length === 0 && unexpectedTables.length === 0) {
      return;
    }

    throw new Error(
      [
        'La estructura de la base de datos no coincide con la esperada.',
        `Tablas esperadas: ${expectedTables.length}.`,
        `Tablas encontradas: ${actualTables.length}.`,
        `Faltan: ${missingTables.join(', ') || 'ninguna'}.`,
        `Inesperadas: ${unexpectedTables.join(', ') || 'ninguna'}.`,
      ].join(' '),
    );
  }

  private async assertApplicationMetadata(queryRunner: QueryRunner): Promise<void> {
    const rows: ApplicationMetadataRow[] = (await queryRunner.query(
      `
          SELECT
            schema_version,
            application_version,
            installation_type,
            created_at,
            imported_at
          FROM application_metadata
          WHERE id = 1
        `,
    )) as ApplicationMetadataRow[];

    if (rows.length !== 1) {
      throw new Error('No se han encontrado los metadatos de la aplicación.');
    }

    const metadata: ApplicationMetadataRow = rows[0];

    if (metadata.schema_version !== DATABASE_SCHEMA_VERSION) {
      throw new Error('La versión guardada en application_metadata no es válida.');
    }

    if (metadata.application_version.trim().length === 0) {
      throw new Error('La versión de la aplicación no está informada.');
    }

    if (metadata.installation_type !== 'new' && metadata.installation_type !== 'legacy_import') {
      throw new Error('El tipo de instalación almacenado no es válido.');
    }

    if (metadata.created_at.trim().length === 0) {
      throw new Error('La fecha de creación de la base no está informada.');
    }
  }

  private async assertIntegrity(queryRunner: QueryRunner): Promise<void> {
    const rows: IntegrityCheckRow[] = (await queryRunner.query(
      'PRAGMA integrity_check',
    )) as IntegrityCheckRow[];

    const errors: string[] = rows
      .map((row: IntegrityCheckRow): string => row.integrity_check)
      .filter((result: string): boolean => result !== 'ok');

    if (errors.length > 0) {
      throw new Error(['La comprobación de integridad ha fallado.', ...errors].join(' '));
    }
  }

  private async assertForeignKeyIntegrity(queryRunner: QueryRunner): Promise<void> {
    const rows: ForeignKeyCheckRow[] = (await queryRunner.query(
      'PRAGMA foreign_key_check',
    )) as ForeignKeyCheckRow[];

    if (rows.length === 0) {
      return;
    }

    throw new Error(
      ['La base de datos contiene relaciones inválidas.', JSON.stringify(rows)].join(' '),
    );
  }

  private isVersionAtLeast(currentVersion: string, minimumVersion: string): boolean {
    const currentParts: number[] = this.parseVersion(currentVersion);

    const minimumParts: number[] = this.parseVersion(minimumVersion);

    if (
      currentParts.some((part: number): boolean => !Number.isInteger(part)) ||
      minimumParts.some((part: number): boolean => !Number.isInteger(part))
    ) {
      return false;
    }

    const partCount: number = Math.max(currentParts.length, minimumParts.length);

    for (let index: number = 0; index < partCount; index++) {
      const currentPart: number = currentParts[index] ?? 0;

      const minimumPart: number = minimumParts[index] ?? 0;

      if (currentPart > minimumPart) {
        return true;
      }

      if (currentPart < minimumPart) {
        return false;
      }
    }

    return true;
  }

  private parseVersion(version: string): number[] {
    return version.split('.').map((part: string): number => Number.parseInt(part, 10));
  }
}
