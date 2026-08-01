import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import { SQLITE_TIMESTAMP_DEFAULT } from '@infrastructure/database/schema/sqlite-schema.constants';

const statements: readonly string[] = [
  `
    CREATE TABLE application_metadata (
      id INTEGER PRIMARY KEY
        CHECK (id = 1),

      schema_version INTEGER NOT NULL
        CHECK (schema_version > 0),

      application_version TEXT NOT NULL,

      installation_type TEXT NOT NULL
        CHECK (
          installation_type IN (
            'new',
            'legacy_import'
          )
        ),

      created_at TEXT NOT NULL,
      imported_at TEXT
    ) STRICT
  `,

  `
    CREATE TABLE legacy_import (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      source_application TEXT NOT NULL,
      source_version TEXT NOT NULL,
      source_schema_version TEXT NOT NULL,

      source_hash TEXT NOT NULL
        CHECK (
          length(source_hash) = 64
          AND source_hash NOT GLOB
            '*[^0-9a-f]*'
        ),

      status TEXT NOT NULL
        CHECK (
          status IN (
            'running',
            'success',
            'success_with_warnings',
            'error'
          )
        ),

      started_at TEXT NOT NULL,
      completed_at TEXT,

      warning_count INTEGER NOT NULL
        DEFAULT 0
        CHECK (warning_count >= 0),

      error_count INTEGER NOT NULL
        DEFAULT 0
        CHECK (error_count >= 0),

      report_relative_path TEXT,

      UNIQUE (
        source_hash
      )
    ) STRICT
  `,

  `
    CREATE TABLE terminal (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      nombre TEXT NOT NULL
        CHECK (
          length(trim(nombre)) BETWEEN 1 AND 100
        ),

      codigo TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          length(trim(codigo)) BETWEEN 1 AND 50
        ),

      activo INTEGER NOT NULL
        DEFAULT 1
        CHECK (activo IN (0, 1)),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT
    ) STRICT
  `,

  `
    CREATE UNIQUE INDEX uq_terminal_codigo_activo
    ON terminal (
      codigo COLLATE NOCASE
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE TABLE archivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      purpose TEXT NOT NULL
        CHECK (
          length(trim(purpose)) > 0
        ),

      original_name TEXT,

      internal_name TEXT NOT NULL
        CHECK (
          length(trim(internal_name)) > 0
        ),

      relative_path TEXT NOT NULL
        UNIQUE
        CHECK (
          length(trim(relative_path)) > 0
          AND relative_path NOT LIKE '/%'
          AND relative_path NOT LIKE '%..%'
          AND relative_path NOT GLOB
            '[A-Za-z]:*'
        ),

      mime_type TEXT NOT NULL
        CHECK (
          length(trim(mime_type)) > 0
        ),

      size_bytes INTEGER NOT NULL
        CHECK (size_bytes >= 0),

      sha256 TEXT NOT NULL
        CHECK (
          length(sha256) = 64
          AND sha256 NOT GLOB
            '*[^0-9a-f]*'
        ),

      width INTEGER
        CHECK (
          width IS NULL
          OR width > 0
        ),

      height INTEGER
        CHECK (
          height IS NULL
          OR height > 0
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT
    ) STRICT
  `,

  `
    CREATE INDEX idx_archivo_sha256
    ON archivo (
      sha256
    )
  `,

  `
    CREATE INDEX idx_archivo_purpose
    ON archivo (
      purpose
    )
  `,

  `
    CREATE TABLE empleado (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      nombre TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          length(trim(nombre)) BETWEEN 1 AND 100
        ),

      password_hash TEXT NOT NULL
        CHECK (
          length(password_hash) > 0
        ),

      password_algorithm TEXT NOT NULL
        CHECK (
          password_algorithm IN (
            'scrypt',
            'bcrypt_legacy'
          )
        ),

      color TEXT NOT NULL
        CHECK (
          length(color) = 6
          AND color NOT GLOB
            '*[^0-9A-F]*'
        ),

      admin INTEGER NOT NULL
        DEFAULT 0
        CHECK (admin IN (0, 1)),

      activo INTEGER NOT NULL
        DEFAULT 1
        CHECK (activo IN (0, 1)),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT
    ) STRICT
  `,

  `
    CREATE UNIQUE INDEX uq_empleado_nombre_activo
    ON empleado (
      nombre COLLATE NOCASE
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE TABLE empleado_permiso (
      id_empleado INTEGER NOT NULL,
      id_permiso INTEGER NOT NULL
        CHECK (id_permiso > 0),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_empleado,
        id_permiso
      ),

      CONSTRAINT fk_empleado_permiso_empleado
        FOREIGN KEY (
          id_empleado
        )
        REFERENCES empleado (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_empleado_permiso_permiso
    ON empleado_permiso (
      id_permiso
    )
  `,

  `
    CREATE TABLE tipo_pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_archivo INTEGER,

      nombre TEXT NOT NULL
        CHECK (
          length(trim(nombre)) BETWEEN 1 AND 100
        ),

      slug TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          length(trim(slug)) BETWEEN 1 AND 100
        ),

      afecta_caja INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          afecta_caja IN (0, 1)
        ),

      orden INTEGER NOT NULL
        DEFAULT 0,

      fisico INTEGER NOT NULL
        DEFAULT 1
        CHECK (
          fisico IN (0, 1)
        ),

      activo INTEGER NOT NULL
        DEFAULT 1
        CHECK (
          activo IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CONSTRAINT fk_tipo_pago_archivo
        FOREIGN KEY (
          id_archivo
        )
        REFERENCES archivo (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE UNIQUE INDEX uq_tipo_pago_slug_activo
    ON tipo_pago (
      slug COLLATE NOCASE
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE INDEX idx_tipo_pago_archivo
    ON tipo_pago (
      id_archivo
    )
  `,

  `
    CREATE TABLE secuencia_documento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      tipo TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          length(trim(tipo)) > 0
        ),

      serie TEXT NOT NULL
        DEFAULT ''
        COLLATE NOCASE,

      ultimo_numero INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          ultimo_numero >= 0
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      UNIQUE (
        tipo,
        serie
      )
    ) STRICT
  `,

  `
    CREATE TABLE caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_terminal INTEGER NOT NULL,

      id_empleado_apertura INTEGER,
      id_empleado_cierre INTEGER,

      apertura TEXT NOT NULL,
      cierre TEXT,

      ventas_cents INTEGER NOT NULL
        DEFAULT 0,

      beneficios_cents INTEGER NOT NULL
        DEFAULT 0,

      descuentos_cents INTEGER NOT NULL
        DEFAULT 0,

      movimientos_entrada_cents INTEGER NOT NULL
        DEFAULT 0,

      movimientos_salida_cents INTEGER NOT NULL
        DEFAULT 0,

      importe_apertura_cents INTEGER NOT NULL
        DEFAULT 0,

      importe_cierre_teorico_cents INTEGER NOT NULL
        DEFAULT 0,

      importe_cierre_real_cents INTEGER NOT NULL
        DEFAULT 0,

      importe_retirado_cents INTEGER NOT NULL
        DEFAULT 0,

      observaciones TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      CHECK (
        cierre IS NULL
        OR cierre >= apertura
      ),

      CONSTRAINT fk_caja_terminal
        FOREIGN KEY (
          id_terminal
        )
        REFERENCES terminal (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_caja_empleado_apertura
        FOREIGN KEY (
          id_empleado_apertura
        )
        REFERENCES empleado (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE,

      CONSTRAINT fk_caja_empleado_cierre
        FOREIGN KEY (
          id_empleado_cierre
        )
        REFERENCES empleado (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE UNIQUE INDEX uq_caja_abierta_terminal
    ON caja (
      id_terminal
    )
    WHERE cierre IS NULL
  `,

  `
    CREATE INDEX idx_caja_terminal_apertura
    ON caja (
      id_terminal,
      apertura
    )
  `,

  `
    CREATE INDEX idx_caja_empleado_apertura
    ON caja (
      id_empleado_apertura
    )
  `,

  `
    CREATE INDEX idx_caja_empleado_cierre
    ON caja (
      id_empleado_cierre
    )
  `,

  `
    CREATE TABLE caja_tipo (
      id_caja INTEGER NOT NULL,
      id_tipo_pago INTEGER NOT NULL,

      operaciones INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          operaciones >= 0
        ),

      importe_total_cents INTEGER NOT NULL
        DEFAULT 0,

      importe_real_cents INTEGER,

      importe_descuento_cents INTEGER NOT NULL
        DEFAULT 0,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_caja,
        id_tipo_pago
      ),

      CONSTRAINT fk_caja_tipo_caja
        FOREIGN KEY (
          id_caja
        )
        REFERENCES caja (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_caja_tipo_tipo_pago
        FOREIGN KEY (
          id_tipo_pago
        )
        REFERENCES tipo_pago (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_caja_tipo_tipo_pago
    ON caja_tipo (
      id_tipo_pago
    )
  `,

  `
    CREATE TABLE caja_recuento (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      id_caja INTEGER NOT NULL,

      momento TEXT NOT NULL
        CHECK (
          momento IN (
            'apertura',
            'cierre'
          )
        ),

      valor_centimos INTEGER NOT NULL
        CHECK (
          valor_centimos > 0
        ),

      cantidad INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          cantidad >= 0
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      UNIQUE (
        id_caja,
        momento,
        valor_centimos
      ),

      CONSTRAINT fk_caja_recuento_caja
        FOREIGN KEY (
          id_caja
        )
        REFERENCES caja (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_caja_recuento_caja
    ON caja_recuento (
      id_caja
    )
  `,

  `
    CREATE TABLE movimiento_caja (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_caja INTEGER NOT NULL,
      id_empleado INTEGER,

      tipo TEXT NOT NULL
        CHECK (
          tipo IN (
            'entrada',
            'salida'
          )
        ),

      concepto TEXT NOT NULL
        CHECK (
          length(trim(concepto)) BETWEEN 1 AND 250
        ),

      importe_cents INTEGER NOT NULL
        CHECK (
          importe_cents > 0
        ),

      descripcion TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CONSTRAINT fk_movimiento_caja_caja
        FOREIGN KEY (
          id_caja
        )
        REFERENCES caja (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_movimiento_caja_empleado
        FOREIGN KEY (
          id_empleado
        )
        REFERENCES empleado (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_movimiento_caja_caja_fecha
    ON movimiento_caja (
      id_caja,
      created_at
    )
  `,

  `
    CREATE INDEX idx_movimiento_caja_empleado
    ON movimiento_caja (
      id_empleado
    )
  `,
];

const coreDatabaseSchema: DatabaseSchemaDefinition = {
  name: 'core',
  statements,
};

export default coreDatabaseSchema;
