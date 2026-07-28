import type InstallationDatabase from '@backend/contracts/installation-database.interface';
import type PasswordHasher from '@backend/contracts/password-hasher.interface';
import type Caja from '@backend/domain/caja/caja.interface';
import type Empleado from '@backend/domain/empleados/empleado.interface';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import cajaSchema from '@infrastructure/database/typeorm/schemas/caja.schema';
import empleadoSchema from '@infrastructure/database/typeorm/schemas/empleado.schema';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { rm } from 'node:fs/promises';
import type { DataSource, DeepPartial, EntityManager } from 'typeorm';

export default class TypeOrmInstallationDatabase implements InstallationDatabase {
  constructor(
    private readonly databaseFile: string,
    private readonly passwordHasher: PasswordHasher,
    private readonly dataSourceFactory: TypeOrmDataSourceFactory,
  ) {}

  async prepare(command: InstallationCommand): Promise<void> {
    await this.delete();

    const dataSource: DataSource = this.dataSourceFactory.create(this.databaseFile);

    try {
      await dataSource.initialize();

      await dataSource.query('PRAGMA foreign_keys = ON');

      await dataSource.runMigrations();

      const passwordHash: string = await this.passwordHasher.hash(command.empleadoInicial.password);

      await dataSource.transaction(async (manager: EntityManager): Promise<void> => {
        await this.createInitialEmployee(manager, command, passwordHash);

        await this.createInitialCashRegister(manager, command);
      });

      await this.checkpointDatabase(dataSource);
    } catch (error: unknown) {
      await this.destroyDataSource(dataSource);
      await this.deleteAuxiliaryFiles();

      await this.delete();

      throw error;
    }

    await this.destroyDataSource(dataSource);
  }

  async delete(): Promise<void> {
    const databaseFiles: readonly string[] = [
      this.databaseFile,
      `${this.databaseFile}-wal`,
      `${this.databaseFile}-shm`,
    ];

    await Promise.all(
      databaseFiles.map((filePath: string): Promise<void> =>
        rm(filePath, {
          force: true,
        }),
      ),
    );
  }

  private async createInitialEmployee(
    manager: EntityManager,
    command: InstallationCommand,
    passwordHash: string,
  ): Promise<void> {
    const normalizedColor: string = command.empleadoInicial.color.replace(/^#/, '').toUpperCase();

    const empleado: DeepPartial<Empleado> = {
      nombre: command.empleadoInicial.nombre,
      passwordHash,
      color: normalizedColor,
      admin: true,
      activo: true,
      deletedAt: null,
    };

    await manager.save(empleadoSchema, empleado);
  }

  private async createInitialCashRegister(
    manager: EntityManager,
    command: InstallationCommand,
  ): Promise<void> {
    const openingAmountCents: number = this.toCents(command.valoresIniciales.cajaInicial);

    const caja: DeepPartial<Caja> = {
      apertura: new Date(),
      cierre: null,

      ventasCents: 0,
      beneficiosCents: 0,

      ventaEfectivoCents: 0,
      operacionesEfectivo: 0,
      descuentoEfectivoCents: 0,

      ventaOtrosCents: 0,
      operacionesOtros: 0,
      descuentoOtrosCents: 0,

      importePagosCajaCents: 0,
      numPagosCaja: 0,

      importeAperturaCents: openingAmountCents,
      importeCierreCents: 0,
      importeCierreRealCents: 0,
      importeRetiradoCents: 0,
    };

    await manager.save(cajaSchema, caja);
  }

  private toCents(amount: number): number {
    const cents: number = Math.round(amount * 100);

    if (!Number.isSafeInteger(cents)) {
      throw new Error('El importe inicial de caja no es válido.');
    }

    return cents;
  }

  private async destroyDataSource(dataSource: DataSource): Promise<void> {
    if (!dataSource.isInitialized) {
      return;
    }

    await dataSource.destroy();
  }

  private async checkpointDatabase(dataSource: DataSource): Promise<void> {
    await dataSource.query('PRAGMA wal_checkpoint(TRUNCATE)');
  }

  private async deleteAuxiliaryFiles(): Promise<void> {
    const auxiliaryFiles: readonly string[] = [
      `${this.databaseFile}-wal`,
      `${this.databaseFile}-shm`,
    ];

    await Promise.all(
      auxiliaryFiles.map((filePath: string): Promise<void> =>
        rm(filePath, {
          force: true,
        }),
      ),
    );
  }
}
