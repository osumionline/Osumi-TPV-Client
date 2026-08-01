import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import { SQLITE_TIMESTAMP_DEFAULT } from '@infrastructure/database/schema/sqlite-schema.constants';

const statements: readonly string[] = [
  `
    CREATE TABLE categoria (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_padre INTEGER,

      nombre TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre = trim(nombre)
          AND length(nombre)
            BETWEEN 1 AND 100
        ),

      orden INTEGER NOT NULL
        DEFAULT 0,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CHECK (
        id_padre IS NULL
        OR id_padre <> id
      ),

      CONSTRAINT fk_categoria_padre
        FOREIGN KEY (
          id_padre
        )
        REFERENCES categoria (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  /*
   * Dos categorías activas no pueden tener el mismo
   * nombre dentro de la misma categoría padre.
   *
   * COALESCE permite aplicar también la restricción
   * a las categorías raíz, cuyo id_padre es NULL.
   */
  `
    CREATE UNIQUE INDEX
      uq_categoria_nombre_padre_activa
    ON categoria (
      COALESCE(id_padre, 0),
      nombre COLLATE NOCASE
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE INDEX idx_categoria_padre_orden
    ON categoria (
      id_padre,
      orden,
      nombre COLLATE NOCASE
    )
  `,

  `
    CREATE TABLE marca (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_archivo INTEGER,

      nombre TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre = trim(nombre)
          AND length(nombre)
            BETWEEN 1 AND 100
        ),

      direccion TEXT,
      telefono TEXT,
      email TEXT,
      web TEXT,
      observaciones TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CONSTRAINT fk_marca_archivo
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
    CREATE INDEX idx_marca_nombre
    ON marca (
      nombre COLLATE NOCASE
    )
  `,

  `
    CREATE INDEX idx_marca_archivo
    ON marca (
      id_archivo
    )
  `,

  `
    CREATE TABLE proveedor (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_archivo INTEGER,

      nombre TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre = trim(nombre)
          AND length(nombre)
            BETWEEN 1 AND 150
        ),

      direccion TEXT,
      telefono TEXT,
      email TEXT,
      web TEXT,
      observaciones TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CONSTRAINT fk_proveedor_archivo
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
    CREATE INDEX idx_proveedor_nombre
    ON proveedor (
      nombre COLLATE NOCASE
    )
  `,

  `
    CREATE INDEX idx_proveedor_archivo
    ON proveedor (
      id_archivo
    )
  `,

  `
    CREATE TABLE comercial (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_proveedor INTEGER NOT NULL,

      nombre TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre = trim(nombre)
          AND length(nombre)
            BETWEEN 1 AND 100
        ),

      telefono TEXT,
      email TEXT,
      observaciones TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CONSTRAINT fk_comercial_proveedor
        FOREIGN KEY (
          id_proveedor
        )
        REFERENCES proveedor (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_comercial_proveedor_nombre
    ON comercial (
      id_proveedor,
      nombre COLLATE NOCASE
    )
  `,

  `
    CREATE TABLE proveedor_marca (
      id_proveedor INTEGER NOT NULL,
      id_marca INTEGER NOT NULL,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_proveedor,
        id_marca
      ),

      CONSTRAINT fk_proveedor_marca_proveedor
        FOREIGN KEY (
          id_proveedor
        )
        REFERENCES proveedor (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_proveedor_marca_marca
        FOREIGN KEY (
          id_marca
        )
        REFERENCES marca (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_proveedor_marca_marca
    ON proveedor_marca (
      id_marca
    )
  `,
];

const catalogDatabaseSchema: DatabaseSchemaDefinition = {
  name: 'catalog',
  statements,
};

export default catalogDatabaseSchema;
