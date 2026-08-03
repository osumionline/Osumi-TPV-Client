import type LegacyImportDumpReader from '@backend/contracts/legacy-import-dump-reader.interface';
import type LegacyImportPhaseImporter from '@backend/contracts/legacy-import-phase-importer.interface';
import type LegacyImportProgressListener from '@backend/contracts/legacy-import-progress-listener.type';
import type LegacyImportExecutionCommand from '@backend/domain/legacy-import/legacy-import-execution-command.interface';
import type LegacyImportPhaseResult from '@backend/domain/legacy-import/legacy-import-phase-result.interface';
import type LegacySqlInsert from '@backend/domain/legacy-import/legacy-sql-insert.interface';
import LegacyImportPublicIdFactory from '@infrastructure/legacy-import/legacy-import-public-id.factory';
import LegacySqlValueReader from '@infrastructure/legacy-import/legacy-sql-value.reader';
import type { QueryRunner } from 'typeorm';

interface LegacyEmployeeRow {
  readonly id: number;
  readonly name: string;
  readonly passwordHash: string | null;
  readonly color: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

interface LegacyEmployeePermissionRow {
  readonly employeeId: number;
  readonly permissionId: number;
  readonly createdAt: string;
}

interface LegacyPaymentTypeRow {
  readonly id: number;
  readonly name: string;
  readonly slug: string;
  readonly affectsCash: boolean;
  readonly order: number;
  readonly physical: boolean;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

interface LegacyCategoryRow {
  readonly id: number;
  readonly parentId: number | null;
  readonly name: string;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface LegacyBrandRow {
  readonly id: number;
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

interface LegacyProviderRow {
  readonly id: number;
  readonly name: string;
  readonly address: string | null;
  readonly phone: string | null;
  readonly email: string | null;
  readonly website: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

interface LegacySalesRepresentativeRow {
  readonly id: number;
  readonly providerId: number | null;
  readonly name: string;
  readonly phone: string | null;
  readonly email: string | null;
  readonly notes: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly deletedAt: string | null;
}

interface LegacyProviderBrandRow {
  readonly providerId: number;
  readonly brandId: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

interface LegacyMasterDataState {
  readonly employees: LegacyEmployeeRow[];
  readonly employeePermissions: LegacyEmployeePermissionRow[];
  readonly paymentTypes: LegacyPaymentTypeRow[];
  readonly categories: LegacyCategoryRow[];
  readonly brands: LegacyBrandRow[];
  readonly providers: LegacyProviderRow[];
  readonly salesRepresentatives: LegacySalesRepresentativeRow[];
  readonly providerBrands: LegacyProviderBrandRow[];
}

interface MutableImportCounters {
  importedRows: number;
  skippedRows: number;
  warningCount: number;
}

const MASTER_DATA_TABLES: readonly string[] = [
  'empleado',
  'empleado_rol',
  'tipo_pago',
  'categoria',
  'marca',
  'proveedor',
  'comercial',
  'proveedor_marca',
];

const DISABLED_LEGACY_PASSWORD_HASH: string =
  '$2b$12$R9h/cIPz0gi.URNNX3kh2OPST9/PgBkqquzi.Ss7KIUgO2t0jWMUW';

export default class LegacyImportMasterDataImporter implements LegacyImportPhaseImporter {
  constructor(
    private readonly dumpReader: LegacyImportDumpReader,
    private readonly valueReader: LegacySqlValueReader,
    private readonly publicIdFactory: LegacyImportPublicIdFactory,
  ) {}

  async import(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
  ): Promise<LegacyImportPhaseResult> {
    this.reportProgress(
      command,
      progressListener,
      'reading-master-data',
      38,
      'Leyendo empleados y datos maestros…',
    );

    const state: LegacyMasterDataState = this.createState();

    await this.dumpReader.read(
      command.packagePath,
      command.expectedTableRows,
      MASTER_DATA_TABLES,

      (insert: LegacySqlInsert): void => {
        this.collectInsert(insert, state);
      },
    );

    const counters: MutableImportCounters = {
      importedRows: 0,
      skippedRows: 0,
      warningCount: 0,
    };

    await queryRunner.startTransaction();

    try {
      await this.insertTerminal(queryRunner, command);

      this.reportProgress(
        command,
        progressListener,
        'importing-employees',
        46,
        'Importando empleados…',
      );

      await this.insertEmployees(queryRunner, command, state, counters);

      await this.insertEmployeePermissions(queryRunner, state, counters);

      this.reportProgress(
        command,
        progressListener,
        'importing-payment-types',
        56,
        'Importando tipos de pago…',
      );

      await this.insertPaymentTypes(queryRunner, command, state, counters);

      this.reportProgress(
        command,
        progressListener,
        'importing-catalog',
        66,
        'Importando categorías, marcas y proveedores…',
      );

      await this.insertCategories(queryRunner, command, state, counters);

      await this.insertBrands(queryRunner, command, state, counters);

      await this.insertProviders(queryRunner, command, state, counters);

      await this.insertSalesRepresentatives(queryRunner, command, state, counters);

      await this.insertProviderBrands(queryRunner, state, counters);

      await queryRunner.commitTransaction();
    } catch (error: unknown) {
      if (queryRunner.isTransactionActive) {
        await queryRunner.rollbackTransaction();
      }

      throw new Error('No se han podido importar los datos maestros.', {
        cause: error,
      });
    }

    return {
      importedRows: counters.importedRows,
      skippedRows: counters.skippedRows,
      warningCount: counters.warningCount,
    };
  }

  private createState(): LegacyMasterDataState {
    return {
      employees: [],
      employeePermissions: [],
      paymentTypes: [],
      categories: [],
      brands: [],
      providers: [],
      salesRepresentatives: [],
      providerBrands: [],
    };
  }

  private collectInsert(insert: LegacySqlInsert, state: LegacyMasterDataState): void {
    switch (insert.tableName) {
      case 'empleado':
        state.employees.push(this.readEmployee(insert));

        return;

      case 'empleado_rol':
        state.employeePermissions.push(this.readEmployeePermission(insert));

        return;

      case 'tipo_pago':
        state.paymentTypes.push(this.readPaymentType(insert));

        return;

      case 'categoria':
        state.categories.push(this.readCategory(insert));

        return;

      case 'marca':
        state.brands.push(this.readBrand(insert));

        return;

      case 'proveedor':
        state.providers.push(this.readProvider(insert));

        return;

      case 'comercial':
        state.salesRepresentatives.push(this.readSalesRepresentative(insert));

        return;

      case 'proveedor_marca':
        state.providerBrands.push(this.readProviderBrand(insert));

        return;
    }
  }

  private readEmployee(insert: LegacySqlInsert): LegacyEmployeeRow {
    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      name: this.requiredTrimmedText(
        this.valueReader.getRequiredText(insert, 'nombre'),
        'empleado.nombre',
      ),
      passwordHash: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'pass')),
      color: this.valueReader.getRequiredText(insert, 'color'),
      createdAt: this.valueReader.getRequiredText(insert, 'created_at'),
      updatedAt: this.valueReader.getRequiredText(insert, 'updated_at'),
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readEmployeePermission(insert: LegacySqlInsert): LegacyEmployeePermissionRow {
    return {
      employeeId: this.valueReader.getRequiredInteger(insert, 'id_empleado'),
      permissionId: this.valueReader.getRequiredInteger(insert, 'id_rol'),
      createdAt: this.valueReader.getRequiredText(insert, 'created_at'),
    };
  }

  private readPaymentType(insert: LegacySqlInsert): LegacyPaymentTypeRow {
    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      name: this.requiredTrimmedText(
        this.valueReader.getRequiredText(insert, 'nombre'),
        'tipo_pago.nombre',
      ),
      slug: this.requiredTrimmedText(
        this.valueReader.getRequiredText(insert, 'slug'),
        'tipo_pago.slug',
      ),
      affectsCash: this.valueReader.getRequiredBoolean(insert, 'afecta_caja'),
      order: this.valueReader.getRequiredInteger(insert, 'orden'),
      physical: this.valueReader.getRequiredBoolean(insert, 'fisico'),
      createdAt: this.valueReader.getRequiredText(insert, 'created_at'),
      updatedAt: this.valueReader.getRequiredText(insert, 'updated_at'),
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readCategory(insert: LegacySqlInsert): LegacyCategoryRow {
    const parentId: number | null = this.valueReader.getOptionalInteger(insert, 'id_padre');
    const createdAt: string = this.valueReader.getRequiredText(insert, 'created_at');
    const updatedAt: string = this.valueReader.getOptionalText(insert, 'updated_at') ?? createdAt;

    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      parentId: parentId === 0 ? null : parentId,
      name: this.requiredTrimmedText(
        this.valueReader.getRequiredText(insert, 'nombre'),
        'categoria.nombre',
      ),
      createdAt,
      updatedAt,
    };
  }

  private readBrand(insert: LegacySqlInsert): LegacyBrandRow {
    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      name: this.requiredTrimmedText(
        this.valueReader.getRequiredText(insert, 'nombre'),
        'marca.nombre',
      ),
      address: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'direccion')),
      phone: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'telefono')),
      email: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'email')),
      website: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'web')),
      notes: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'observaciones')),
      createdAt: this.valueReader.getRequiredText(insert, 'created_at'),
      updatedAt: this.valueReader.getRequiredText(insert, 'updated_at'),
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readProvider(insert: LegacySqlInsert): LegacyProviderRow {
    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      name: this.requiredTrimmedText(
        this.valueReader.getRequiredText(insert, 'nombre'),
        'proveedor.nombre',
      ),
      address: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'direccion')),
      phone: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'telefono')),
      email: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'email')),
      website: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'web')),
      notes: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'observaciones')),
      createdAt: this.valueReader.getRequiredText(insert, 'created_at'),
      updatedAt: this.valueReader.getRequiredText(insert, 'updated_at'),
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readSalesRepresentative(insert: LegacySqlInsert): LegacySalesRepresentativeRow {
    return {
      id: this.valueReader.getRequiredInteger(insert, 'id'),
      providerId: this.valueReader.getOptionalInteger(insert, 'id_proveedor'),
      name: this.requiredTrimmedText(
        this.valueReader.getRequiredText(insert, 'nombre'),
        'comercial.nombre',
      ),
      phone: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'telefono')),
      email: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'email')),
      notes: this.normalizeOptionalText(this.valueReader.getOptionalText(insert, 'observaciones')),
      createdAt: this.valueReader.getRequiredText(insert, 'created_at'),
      updatedAt: this.valueReader.getRequiredText(insert, 'updated_at'),
      deletedAt: this.valueReader.getOptionalText(insert, 'deleted_at'),
    };
  }

  private readProviderBrand(insert: LegacySqlInsert): LegacyProviderBrandRow {
    return {
      providerId: this.valueReader.getRequiredInteger(insert, 'id_proveedor'),
      brandId: this.valueReader.getRequiredInteger(insert, 'id_marca'),
      createdAt: this.valueReader.getRequiredText(insert, 'created_at'),
      updatedAt: this.valueReader.getRequiredText(insert, 'updated_at'),
    };
  }

  private async insertTerminal(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
  ): Promise<void> {
    await queryRunner.query(
      `
        INSERT INTO terminal (
          id,
          public_id,
          nombre,
          codigo,
          activo,
          created_at,
          updated_at,
          deleted_at
        )
        VALUES (
          1,
          ?,
          'Terminal principal',
          'principal',
          1,
          ?,
          ?,
          NULL
        )
      `,
      [
        this.publicIdFactory.create(command.sourceHash, 'terminal', 1),
        command.startedAt,
        command.startedAt,
      ],
    );
  }

  private async insertEmployees(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    state: LegacyMasterDataState,
    counters: MutableImportCounters,
  ): Promise<void> {
    for (const employee of state.employees) {
      let passwordHash: string = employee.passwordHash ?? DISABLED_LEGACY_PASSWORD_HASH;

      if (employee.passwordHash === null || !this.isBcryptHash(employee.passwordHash)) {
        passwordHash = DISABLED_LEGACY_PASSWORD_HASH;

        counters.warningCount++;
      }

      const color: string = this.normalizeColor(employee.color, counters);

      await queryRunner.query(
        `
          INSERT INTO empleado (
            id,
            public_id,
            nombre,
            password_hash,
            password_algorithm,
            color,
            admin,
            activo,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            'bcrypt_legacy',
            ?,
            0,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          employee.id,

          this.publicIdFactory.create(command.sourceHash, 'empleado', employee.id),

          employee.name,
          passwordHash,
          color,

          employee.deletedAt === null ? 1 : 0,

          employee.createdAt,
          employee.updatedAt,
          employee.deletedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async insertEmployeePermissions(
    queryRunner: QueryRunner,
    state: LegacyMasterDataState,
    counters: MutableImportCounters,
  ): Promise<void> {
    const employeeIds: ReadonlySet<number> = new Set<number>(
      state.employees.map((employee: LegacyEmployeeRow): number => employee.id),
    );

    const insertedKeys: Set<string> = new Set<string>();

    for (const permission of state.employeePermissions) {
      const key: string = [permission.employeeId, permission.permissionId].join(':');

      if (
        !employeeIds.has(permission.employeeId) ||
        permission.permissionId <= 0 ||
        insertedKeys.has(key)
      ) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      await queryRunner.query(
        `
          INSERT INTO empleado_permiso (
            id_empleado,
            id_permiso,
            created_at
          )
          VALUES (
            ?,
            ?,
            ?
          )
        `,
        [permission.employeeId, permission.permissionId, permission.createdAt],
      );

      insertedKeys.add(key);

      counters.importedRows++;
    }
  }

  private async insertPaymentTypes(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    state: LegacyMasterDataState,
    counters: MutableImportCounters,
  ): Promise<void> {
    for (const paymentType of state.paymentTypes) {
      await queryRunner.query(
        `
          INSERT INTO tipo_pago (
            id,
            public_id,
            id_archivo,
            nombre,
            slug,
            afecta_caja,
            orden,
            fisico,
            activo,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            NULL,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          paymentType.id,
          this.publicIdFactory.create(command.sourceHash, 'tipo_pago', paymentType.id),
          paymentType.name,
          paymentType.slug,
          paymentType.affectsCash ? 1 : 0,
          paymentType.order,
          paymentType.physical ? 1 : 0,
          paymentType.deletedAt === null ? 1 : 0,
          paymentType.createdAt,
          paymentType.updatedAt,
          paymentType.deletedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async insertCategories(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    state: LegacyMasterDataState,
    counters: MutableImportCounters,
  ): Promise<void> {
    const pendingCategories: Map<number, LegacyCategoryRow> = new Map<number, LegacyCategoryRow>(
      state.categories.map((category: LegacyCategoryRow): [number, LegacyCategoryRow] => [
        category.id,
        category,
      ]),
    );

    const insertedCategoryIds: Set<number> = new Set<number>();

    while (pendingCategories.size > 0) {
      let insertedInIteration: number = 0;

      for (const [categoryId, category] of pendingCategories) {
        if (category.parentId !== null && !insertedCategoryIds.has(category.parentId)) {
          continue;
        }

        await queryRunner.query(
          `
            INSERT INTO categoria (
              id,
              public_id,
              id_padre,
              nombre,
              orden,
              created_at,
              updated_at,
              deleted_at
            )
            VALUES (
              ?,
              ?,
              ?,
              ?,
              0,
              ?,
              ?,
              NULL
            )
          `,
          [
            category.id,
            this.publicIdFactory.create(command.sourceHash, 'categoria', category.id),
            category.parentId,
            category.name,
            category.createdAt,
            category.updatedAt,
          ],
        );

        insertedCategoryIds.add(category.id);

        pendingCategories.delete(categoryId);

        counters.importedRows++;
        insertedInIteration++;
      }

      if (insertedInIteration === 0) {
        throw new Error(
          [
            'No se puede resolver la jerarquía',
            'de categorías legacy.',
            `Categorías pendientes: ${[...pendingCategories.keys()].join(', ')}.`,
          ].join(' '),
        );
      }
    }
  }

  private async insertBrands(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    state: LegacyMasterDataState,
    counters: MutableImportCounters,
  ): Promise<void> {
    for (const brand of state.brands) {
      await queryRunner.query(
        `
          INSERT INTO marca (
            id,
            public_id,
            id_archivo,
            nombre,
            direccion,
            telefono,
            email,
            web,
            observaciones,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            NULL,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          brand.id,
          this.publicIdFactory.create(command.sourceHash, 'marca', brand.id),
          brand.name,
          brand.address,
          brand.phone,
          brand.email,
          brand.website,
          brand.notes,
          brand.createdAt,
          brand.updatedAt,
          brand.deletedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async insertProviders(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    state: LegacyMasterDataState,
    counters: MutableImportCounters,
  ): Promise<void> {
    for (const provider of state.providers) {
      await queryRunner.query(
        `
          INSERT INTO proveedor (
            id,
            public_id,
            id_archivo,
            nombre,
            direccion,
            telefono,
            email,
            web,
            observaciones,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            NULL,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          provider.id,
          this.publicIdFactory.create(command.sourceHash, 'proveedor', provider.id),
          provider.name,
          provider.address,
          provider.phone,
          provider.email,
          provider.website,
          provider.notes,
          provider.createdAt,
          provider.updatedAt,
          provider.deletedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async insertSalesRepresentatives(
    queryRunner: QueryRunner,
    command: LegacyImportExecutionCommand,
    state: LegacyMasterDataState,
    counters: MutableImportCounters,
  ): Promise<void> {
    const providerIds: ReadonlySet<number> = new Set<number>(
      state.providers.map((provider: LegacyProviderRow): number => provider.id),
    );

    for (const representative of state.salesRepresentatives) {
      if (representative.providerId === null || !providerIds.has(representative.providerId)) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      await queryRunner.query(
        `
          INSERT INTO comercial (
            id,
            public_id,
            id_proveedor,
            nombre,
            telefono,
            email,
            observaciones,
            created_at,
            updated_at,
            deleted_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          representative.id,
          this.publicIdFactory.create(command.sourceHash, 'comercial', representative.id),
          representative.providerId,
          representative.name,
          representative.phone,
          representative.email,
          representative.notes,
          representative.createdAt,
          representative.updatedAt,
          representative.deletedAt,
        ],
      );

      counters.importedRows++;
    }
  }

  private async insertProviderBrands(
    queryRunner: QueryRunner,
    state: LegacyMasterDataState,
    counters: MutableImportCounters,
  ): Promise<void> {
    const providerIds: ReadonlySet<number> = new Set<number>(
      state.providers.map((provider: LegacyProviderRow): number => provider.id),
    );

    const brandIds: ReadonlySet<number> = new Set<number>(
      state.brands.map((brand: LegacyBrandRow): number => brand.id),
    );

    const insertedKeys: Set<string> = new Set<string>();

    for (const providerBrand of state.providerBrands) {
      const key: string = [providerBrand.providerId, providerBrand.brandId].join(':');

      if (
        !providerIds.has(providerBrand.providerId) ||
        !brandIds.has(providerBrand.brandId) ||
        insertedKeys.has(key)
      ) {
        counters.skippedRows++;
        counters.warningCount++;

        continue;
      }

      await queryRunner.query(
        `
          INSERT INTO proveedor_marca (
            id_proveedor,
            id_marca,
            created_at,
            updated_at
          )
          VALUES (
            ?,
            ?,
            ?,
            ?
          )
        `,
        [
          providerBrand.providerId,
          providerBrand.brandId,
          providerBrand.createdAt,
          providerBrand.updatedAt,
        ],
      );

      insertedKeys.add(key);

      counters.importedRows++;
    }
  }

  private isBcryptHash(value: string): boolean {
    return /^\$2[aby]\$\d{2}\$/.test(value);
  }

  private normalizeColor(value: string, counters: MutableImportCounters): string {
    const normalized: string = value.trim().replace(/^#/, '').toUpperCase();

    if (/^[0-9A-F]{6}$/.test(normalized)) {
      return normalized;
    }

    counters.warningCount++;

    return '607D8B';
  }

  private normalizeOptionalText(value: string | null): string | null {
    if (value === null) {
      return null;
    }

    const normalized: string = value.trim();

    return normalized.length === 0 ? null : normalized;
  }

  private requiredTrimmedText(value: string, columnName: string): string {
    const normalized: string = value.trim();

    if (normalized.length === 0) {
      throw new Error(`La columna ${columnName} está vacía.`);
    }

    return normalized;
  }

  private reportProgress(
    command: LegacyImportExecutionCommand,
    progressListener: LegacyImportProgressListener,
    stage: Parameters<LegacyImportProgressListener>[0]['stage'],
    percentage: number,
    message: string,
  ): void {
    progressListener({
      selectionId: command.selectionId,
      stage,
      percentage,
      message,
    });
  }
}
