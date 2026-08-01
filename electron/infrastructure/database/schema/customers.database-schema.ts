import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import { SQLITE_TIMESTAMP_DEFAULT } from '@infrastructure/database/schema/sqlite-schema.constants';

const statements: readonly string[] = [
  `
    CREATE TABLE cliente (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      nombre_apellidos TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre_apellidos =
            trim(nombre_apellidos)
          AND length(nombre_apellidos)
            BETWEEN 1 AND 150
        ),

      dni_cif TEXT
        COLLATE NOCASE
        CHECK (
          dni_cif IS NULL
          OR (
            dni_cif = trim(dni_cif)
            AND length(dni_cif)
              BETWEEN 1 AND 30
          )
        ),

      telefono TEXT
        CHECK (
          telefono IS NULL
          OR (
            telefono = trim(telefono)
            AND length(telefono)
              BETWEEN 1 AND 30
          )
        ),

      email TEXT
        COLLATE NOCASE
        CHECK (
          email IS NULL
          OR (
            email = trim(email)
            AND length(email)
              BETWEEN 3 AND 254
          )
        ),

      direccion TEXT,
      codigo_postal TEXT,
      poblacion TEXT,

      /*
       * Código estático de provincia.
       *
       * No se crea una tabla provincia porque su
       * catálogo será estático en la aplicación.
       */
      id_provincia INTEGER
        CHECK (
          id_provincia IS NULL
          OR id_provincia > 0
        ),

      datos_facturacion_iguales INTEGER NOT NULL
        DEFAULT 1
        CHECK (
          datos_facturacion_iguales
          IN (0, 1)
        ),

      fact_nombre_apellidos TEXT
        COLLATE NOCASE,

      fact_dni_cif TEXT
        COLLATE NOCASE,

      fact_telefono TEXT,

      fact_email TEXT
        COLLATE NOCASE,

      fact_direccion TEXT,
      fact_codigo_postal TEXT,
      fact_poblacion TEXT,

      fact_id_provincia INTEGER
        CHECK (
          fact_id_provincia IS NULL
          OR fact_id_provincia > 0
        ),

      observaciones TEXT,

      /*
       * Descuento predeterminado del cliente en
       * puntos básicos.
       */
      descuento_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          descuento_bps
          BETWEEN 0 AND 10000
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT
    ) STRICT
  `,

  /*
   * Un DNI o CIF no vacío solo puede pertenecer
   * a un cliente activo.
   *
   * Los clientes sin documento pueden repetirse
   * y los registros eliminados no bloquean la
   * reutilización.
   */
  `
    CREATE UNIQUE INDEX
      uq_cliente_dni_cif_activo
    ON cliente (
      dni_cif COLLATE NOCASE
    )
    WHERE
      dni_cif IS NOT NULL
      AND trim(dni_cif) <> ''
      AND deleted_at IS NULL
  `,

  /*
   * El nombre no es único. Dos clientes pueden
   * llamarse igual.
   */
  `
    CREATE INDEX idx_cliente_nombre
    ON cliente (
      nombre_apellidos COLLATE NOCASE
    )
  `,

  `
    CREATE INDEX idx_cliente_email
    ON cliente (
      email COLLATE NOCASE
    )
    WHERE email IS NOT NULL
  `,

  `
    CREATE INDEX idx_cliente_telefono
    ON cliente (
      telefono
    )
    WHERE telefono IS NOT NULL
  `,

  `
    CREATE TABLE reserva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_cliente INTEGER NOT NULL,

      total_cents INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          total_cents >= 0
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CONSTRAINT fk_reserva_cliente
        FOREIGN KEY (
          id_cliente
        )
        REFERENCES cliente (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_reserva_cliente_fecha
    ON reserva (
      id_cliente,
      created_at
    )
  `,

  `
    CREATE INDEX idx_reserva_activa_fecha
    ON reserva (
      created_at
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE TABLE linea_reserva (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_reserva INTEGER NOT NULL,

      /*
       * Puede quedar a NULL para conservar el
       * histórico aunque el artículo sea eliminado.
       */
      id_articulo INTEGER,

      nombre_articulo TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre_articulo =
            trim(nombre_articulo)
          AND length(nombre_articulo)
            BETWEEN 1 AND 200
        ),

      /*
       * Precio unitario de compra histórico en
       * microeuros.
       */
      puc_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          puc_micros >= 0
        ),

      /*
       * Valores finales de venta en céntimos.
       */
      pvp_cents INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          pvp_cents >= 0
        ),

      iva_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          iva_bps
          BETWEEN 0 AND 10000
        ),

      importe_cents INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          importe_cents >= 0
        ),

      descuento_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          descuento_bps
          BETWEEN 0 AND 10000
        ),

      importe_descuento_cents INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          importe_descuento_cents >= 0
        ),

      unidades INTEGER NOT NULL
        CHECK (
          unidades > 0
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      CONSTRAINT fk_linea_reserva_reserva
        FOREIGN KEY (
          id_reserva
        )
        REFERENCES reserva (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_linea_reserva_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_linea_reserva_reserva
    ON linea_reserva (
      id_reserva
    )
  `,

  `
    CREATE INDEX idx_linea_reserva_articulo
    ON linea_reserva (
      id_articulo
    )
  `,
];

const customersDatabaseSchema: DatabaseSchemaDefinition = {
  name: 'customers',
  statements,
};

export default customersDatabaseSchema;
