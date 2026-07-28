import type { MigrationInterface, QueryRunner } from 'typeorm';

export default class InitialSchema2026072700000 implements MigrationInterface {
  readonly name: string = 'InitialSchema2026072700000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`
      CREATE TABLE "empleado" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "nombre" varchar(100) COLLATE NOCASE NOT NULL,
        "password_hash" varchar(255) NOT NULL,
        "color" varchar(6) NOT NULL,
        "admin" boolean NOT NULL DEFAULT (0),
        "activo" boolean NOT NULL DEFAULT (1),
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now')),
        "deleted_at" datetime,
        CONSTRAINT "UQ_empleado_nombre"
          UNIQUE ("nombre")
      )
    `);

    await queryRunner.query(`
      CREATE TABLE "empleado_permiso" (
        "id_empleado" integer NOT NULL,
        "id_permiso" integer NOT NULL,
        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        CONSTRAINT "PK_empleado_permiso"
          PRIMARY KEY ("id_empleado", "id_permiso"),
        CONSTRAINT "FK_empleado_permiso_empleado"
          FOREIGN KEY ("id_empleado")
          REFERENCES "empleado" ("id")
          ON DELETE CASCADE
          ON UPDATE CASCADE
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_empleado_permiso_permiso"
      ON "empleado_permiso" ("id_permiso")
    `);

    await queryRunner.query(`
      CREATE TABLE "caja" (
        "id" integer PRIMARY KEY AUTOINCREMENT NOT NULL,
        "apertura" datetime NOT NULL,
        "cierre" datetime,

        "ventas_cents" integer NOT NULL DEFAULT (0),
        "beneficios_cents" integer NOT NULL DEFAULT (0),

        "venta_efectivo_cents" integer NOT NULL DEFAULT (0),
        "operaciones_efectivo" integer NOT NULL DEFAULT (0),
        "descuento_efectivo_cents" integer NOT NULL DEFAULT (0),

        "venta_otros_cents" integer NOT NULL DEFAULT (0),
        "operaciones_otros" integer NOT NULL DEFAULT (0),
        "descuento_otros_cents" integer NOT NULL DEFAULT (0),

        "importe_pagos_caja_cents" integer NOT NULL DEFAULT (0),
        "num_pagos_caja" integer NOT NULL DEFAULT (0),

        "importe_apertura_cents" integer NOT NULL DEFAULT (0),
        "importe_cierre_cents" integer NOT NULL DEFAULT (0),
        "importe_cierre_real_cents" integer NOT NULL DEFAULT (0),
        "importe_retirado_cents" integer NOT NULL DEFAULT (0),

        "created_at" datetime NOT NULL DEFAULT (datetime('now')),
        "updated_at" datetime NOT NULL DEFAULT (datetime('now'))
      )
    `);

    await queryRunner.query(`
      CREATE INDEX "IDX_caja_cierre"
      ON "caja" ("cierre")
    `);
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX "IDX_caja_cierre"');

    await queryRunner.query('DROP TABLE "caja"');

    await queryRunner.query('DROP INDEX "IDX_empleado_permiso_permiso"');

    await queryRunner.query('DROP TABLE "empleado_permiso"');

    await queryRunner.query('DROP TABLE "empleado"');
  }
}
