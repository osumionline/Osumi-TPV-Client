import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import { SQLITE_TIMESTAMP_DEFAULT } from '@infrastructure/database/schema/sqlite-schema.constants';

const statements: readonly string[] = [
  `
    CREATE TABLE historico_articulo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_articulo INTEGER NOT NULL,

      /*
       * Se conserva como código numérico porque el
       * comentario del dump antiguo no coincide con
       * los valores reales encontrados.
       *
       * El paquete contiene valores del 1 al 6.
       */
      tipo INTEGER NOT NULL
        CHECK (
          tipo >= 0
        ),

      stock_previo INTEGER NOT NULL
        DEFAULT 0,

      /*
       * Se conserva el valor legacy literalmente.
       *
       * En algunas operaciones representa unidades
       * afectadas y en otras una variación firmada.
       */
      diferencia INTEGER NOT NULL
        DEFAULT 0,

      stock_final INTEGER NOT NULL
        DEFAULT 0,

      id_venta INTEGER,
      id_pedido INTEGER,
      id_merma_caducidad INTEGER,

      puc_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          puc_micros >= 0
        ),

      /*
       * Puede ser negativo para conservar algunos
       * ajustes históricos de ventas.
       */
      pvp_micros INTEGER NOT NULL
        DEFAULT 0,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      CONSTRAINT fk_historico_articulo_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_historico_articulo_venta
        FOREIGN KEY (
          id_venta
        )
        REFERENCES venta (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE,

      CONSTRAINT fk_historico_articulo_pedido
        FOREIGN KEY (
          id_pedido
        )
        REFERENCES pedido (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE,

      CONSTRAINT fk_historico_articulo_merma
        FOREIGN KEY (
          id_merma_caducidad
        )
        REFERENCES merma_caducidad (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_historico_articulo_fecha
    ON historico_articulo (
      id_articulo,
      created_at
    )
  `,

  `
    CREATE INDEX idx_historico_articulo_tipo_fecha
    ON historico_articulo (
      tipo,
      created_at
    )
  `,

  `
    CREATE INDEX idx_historico_articulo_venta
    ON historico_articulo (
      id_venta
    )
    WHERE id_venta IS NOT NULL
  `,

  `
    CREATE INDEX idx_historico_articulo_pedido
    ON historico_articulo (
      id_pedido
    )
    WHERE id_pedido IS NOT NULL
  `,

  `
    CREATE INDEX idx_historico_articulo_merma
    ON historico_articulo (
      id_merma_caducidad
    )
    WHERE id_merma_caducidad IS NOT NULL
  `,

  /*
   * Fotografía diaria del valor total del almacén.
   */
  `
    CREATE TABLE historico_almacen (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      /*
       * Fecha en formato YYYY-MM-DD.
       *
       * Sustituye las columnas year, month y day.
       */
      fecha TEXT NOT NULL
        UNIQUE
        CHECK (
          length(fecha) = 10
        ),

      /*
       * Los totales pueden ser negativos si hay
       * artículos con stock negativo.
       */
      total_puc_cents INTEGER NOT NULL
        DEFAULT 0,

      total_pvp_cents INTEGER NOT NULL
        DEFAULT 0,

      /*
       * Margen con seis decimales de porcentaje.
       *
       * 29,845123 %
       * → 29.845.123
       */
      margen_medio_microporcentaje INTEGER NOT NULL
        DEFAULT 0,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT})
    ) STRICT
  `,

  `
    CREATE INDEX idx_historico_almacen_fecha
    ON historico_almacen (
      fecha
    )
  `,
];

const historyDatabaseSchema: DatabaseSchemaDefinition = {
  name: 'history',
  statements,
};

export default historyDatabaseSchema;
