import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import { SQLITE_TIMESTAMP_DEFAULT } from '@infrastructure/database/schema/sqlite-schema.constants';

const statements: readonly string[] = [
  `
    CREATE TABLE pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_proveedor INTEGER NOT NULL,

      /*
       * Método utilizado para pagar al proveedor.
       *
       * Se relaciona con tipo_pago. Durante la
       * importación legacy:
       *
       *   metodo_pago = 0
       *   → tipo de pago "Efectivo"
       *
       *   metodo_pago > 0
       *   → tipo_pago con el ID correspondiente
       *
       *   metodo_pago = NULL
       *   → id_tipo_pago = NULL
       */
      id_tipo_pago INTEGER,

      tipo TEXT NOT NULL
        CHECK (
          tipo IN (
            'albaran',
            'factura',
            'abono'
          )
        ),

      /*
       * Número asignado por el proveedor.
       *
       * No es único porque distintos proveedores
       * pueden utilizar la misma numeración y los
       * datos legacy contienen repeticiones.
       */
      numero TEXT
        COLLATE NOCASE
        CHECK (
          numero IS NULL
          OR (
            numero = trim(numero)
            AND length(numero)
              BETWEEN 1 AND 200
          )
        ),

      /*
       * El dominio de compras utiliza microeuros.
       *
       * 703,5320 €
       * → 703.532.000 microeuros
       */
      importe_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          importe_micros >= 0
        ),

      portes_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          portes_micros >= 0
        ),

      /*
       * Porcentaje de descuento en puntos básicos.
       *
       * 10 %
       * → 1000
       *
       * 33,3 %
       * → 3330
       */
      descuento_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          descuento_bps
          BETWEEN 0 AND 10000
        ),

      fecha_pago TEXT,
      fecha_pedido TEXT,
      fecha_recepcionado TEXT,

      recargo_equivalencia INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          recargo_equivalencia
          IN (0, 1)
        ),

      europeo INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          europeo IN (0, 1)
        ),

      faltas INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          faltas IN (0, 1)
        ),

      recepcionado INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          recepcionado IN (0, 1)
        ),

      observaciones TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CHECK (
        fecha_recepcionado IS NULL
        OR fecha_pedido IS NULL
        OR fecha_recepcionado >= fecha_pedido
      ),

      CONSTRAINT fk_pedido_proveedor
        FOREIGN KEY (
          id_proveedor
        )
        REFERENCES proveedor (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_pedido_tipo_pago
        FOREIGN KEY (
          id_tipo_pago
        )
        REFERENCES tipo_pago (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_pedido_proveedor_fecha
    ON pedido (
      id_proveedor,
      fecha_pedido
    )
  `,

  `
    CREATE INDEX idx_pedido_tipo_numero
    ON pedido (
      tipo,
      numero COLLATE NOCASE
    )
  `,

  `
    CREATE INDEX idx_pedido_tipo_pago
    ON pedido (
      id_tipo_pago
    )
  `,

  `
    CREATE INDEX idx_pedido_recepcionado_fecha
    ON pedido (
      recepcionado,
      fecha_pedido
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE INDEX idx_pedido_fecha_pago
    ON pedido (
      fecha_pago
    )
    WHERE
      fecha_pago IS NOT NULL
      AND deleted_at IS NULL
  `,

  `
    CREATE TABLE linea_pedido (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_pedido INTEGER NOT NULL,

      /*
       * Puede quedar a NULL si el artículo histórico
       * se elimina físicamente o no se puede recuperar
       * durante una importación.
       *
       * El nombre y los precios quedan guardados como
       * instantánea de la línea.
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

      codigo_barras TEXT
        CHECK (
          codigo_barras IS NULL
          OR (
            codigo_barras =
              trim(codigo_barras)
            AND length(codigo_barras)
              BETWEEN 1 AND 100
          )
        ),

      /*
       * Se permiten cero unidades para conservar
       * líneas legacy pendientes o incompletas.
       */
      unidades INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          unidades >= 0
        ),

      /*
       * Valores del dominio de compras expresados
       * en microeuros.
       */
      palb_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          palb_micros >= 0
        ),

      puc_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          puc_micros >= 0
        ),

      /*
       * El PVP histórico de una línea de pedido
       * también usa microeuros porque el sistema
       * antiguo contiene valores con tres decimales.
       */
      pvp_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          pvp_micros >= 0
        ),

      margen_microporcentaje INTEGER NOT NULL
        DEFAULT 0,

      iva_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          iva_bps
          BETWEEN 0 AND 10000
        ),

      recargo_equivalencia_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          recargo_equivalencia_bps
          BETWEEN 0 AND 10000
        ),

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

      CONSTRAINT fk_linea_pedido_pedido
        FOREIGN KEY (
          id_pedido
        )
        REFERENCES pedido (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_linea_pedido_articulo
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
    CREATE INDEX idx_linea_pedido_pedido
    ON linea_pedido (
      id_pedido
    )
  `,

  `
    CREATE INDEX idx_linea_pedido_articulo
    ON linea_pedido (
      id_articulo
    )
  `,

  `
    CREATE INDEX idx_linea_pedido_codigo_barras
    ON linea_pedido (
      codigo_barras
    )
    WHERE codigo_barras IS NOT NULL
  `,

  /*
   * Sustituye a la tabla pdf_pedido.
   *
   * Los datos físicos del documento viven en archivo.
   * Esta tabla únicamente establece su relación con
   * el pedido.
   */
  `
    CREATE TABLE pedido_archivo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_pedido INTEGER NOT NULL,
      id_archivo INTEGER NOT NULL,

      tipo TEXT NOT NULL
        DEFAULT 'documento'
        CHECK (
          tipo IN (
            'albaran',
            'factura',
            'abono',
            'documento',
            'otro'
          )
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      UNIQUE (
        id_pedido,
        id_archivo
      ),

      CONSTRAINT fk_pedido_archivo_pedido
        FOREIGN KEY (
          id_pedido
        )
        REFERENCES pedido (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_pedido_archivo_archivo
        FOREIGN KEY (
          id_archivo
        )
        REFERENCES archivo (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_pedido_archivo_pedido
    ON pedido_archivo (
      id_pedido
    )
  `,

  `
    CREATE INDEX idx_pedido_archivo_archivo
    ON pedido_archivo (
      id_archivo
    )
  `,

  /*
   * Configuración de columnas visibles en la
   * pantalla de un pedido.
   *
   * id_columna hace referencia a un catálogo
   * estático del frontend, del mismo modo que los
   * permisos de empleado.
   */
  `
    CREATE TABLE vista_pedido (
      id_pedido INTEGER NOT NULL,

      id_columna INTEGER NOT NULL
        CHECK (
          id_columna > 0
        ),

      visible INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          visible IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_pedido,
        id_columna
      ),

      CONSTRAINT fk_vista_pedido_pedido
        FOREIGN KEY (
          id_pedido
        )
        REFERENCES pedido (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_vista_pedido_columna
    ON vista_pedido (
      id_columna
    )
  `,
];

const purchasesDatabaseSchema: DatabaseSchemaDefinition = {
  name: 'purchases',
  statements,
};

export default purchasesDatabaseSchema;
