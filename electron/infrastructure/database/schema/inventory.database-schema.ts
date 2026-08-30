import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import { SQLITE_TIMESTAMP_DEFAULT } from '@infrastructure/database/schema/sqlite-schema.constants';

const statements: readonly string[] = [
  `
    CREATE TABLE articulo (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      /*
       * Identificador habitual del artículo.
       *
       * Los artículos activos deben tener un
       * localizador positivo.
       *
       * Se permite conservar un cero únicamente en
       * registros legacy que ya estén eliminados.
       */
      localizador INTEGER NOT NULL,

      nombre TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre = trim(nombre)
          AND length(nombre)
            BETWEEN 1 AND 200
        ),

      slug TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          slug = trim(slug)
          AND length(slug)
            BETWEEN 1 AND 200
        ),

      /*
       * Todos los artículos deben tener una marca.
       * Cuando no proceda se utilizará una marca
       * funcional como "Sin marca".
       */
      id_marca INTEGER NOT NULL,

      id_proveedor INTEGER,

      referencia TEXT,

      /*
       * Precio del albarán en microeuros.
       *
       * 1,234567 € = 1.234.567 microeuros.
       */
      palb_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          palb_micros >= 0
        ),

      /*
       * Precio unitario de compra en microeuros.
       */
      puc_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          puc_micros >= 0
        ),

      /*
       * Precio final de venta en céntimos.
       *
       * 12,50 € = 1.250 céntimos.
       */
      pvp_cents INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          pvp_cents >= 0
        ),

      pvp_descuento_cents INTEGER
        CHECK (
          pvp_descuento_cents IS NULL
          OR pvp_descuento_cents >= 0
        ),

      /*
       * Impuestos y márgenes expresados en
       * puntos básicos.
       *
       * 21 %   = 2100
       * 5,20 % = 520
       */
      iva_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          iva_bps BETWEEN 0 AND 10000
        ),

      re_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          re_bps BETWEEN 0 AND 10000
        ),

      /*
       * El margen puede ser negativo.
       */
      margen_microporcentaje INTEGER NOT NULL
        DEFAULT 0,

      margen_descuento_microporcentaje INTEGER,

      /*
       * El stock puede ser negativo. La aplicación
       * antigua ya permite que se produzca esta
       * situación y no debemos perderla durante
       * la importación.
       */
      stock INTEGER NOT NULL
        DEFAULT 0,

      stock_min INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          stock_min >= 0
        ),

      stock_max INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          stock_max >= 0
        ),

      lote_optimo INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          lote_optimo >= 0
        ),

      venta_online INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          venta_online IN (0, 1)
        ),

      /*
       * Fecha de caducidad más próxima entre las
       * unidades actualmente disponibles.
       *
       * Al vender el artículo se utiliza para mostrar
       * un aviso no bloqueante al empleado.
       */
      fecha_caducidad TEXT,

      mostrar_en_web INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          mostrar_en_web IN (0, 1)
        ),

      descripcion_corta TEXT,
      descripcion TEXT,
      observaciones TEXT,

      mostrar_observaciones_pedidos INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          mostrar_observaciones_pedidos
          IN (0, 1)
        ),

      mostrar_observaciones_ventas INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          mostrar_observaciones_ventas
          IN (0, 1)
        ),

      /*
       * Código numérico opcional para seleccionar
       * rápidamente el artículo desde ventas.
       *
       * Ejemplo:
       *
       *   1 + Intro
       *   → Bolsa de plástico
       */
      acceso_directo INTEGER,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      /*
       * Los registros activos deben tener un
       * localizador positivo.
       */
      CHECK (
        localizador > 0
        OR deleted_at IS NOT NULL
      ),

      CHECK (
        acceso_directo IS NULL
        OR acceso_directo > 0
      ),

      /*
       * Un artículo no puede tener como acceso
       * directo su propio localizador.
       */
      CHECK (
        acceso_directo IS NULL
        OR acceso_directo <> localizador
      ),

      CHECK (
        stock_max = 0
        OR stock_max >= stock_min
      ),

      CONSTRAINT fk_articulo_marca
        FOREIGN KEY (
          id_marca
        )
        REFERENCES marca (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_articulo_proveedor
        FOREIGN KEY (
          id_proveedor
        )
        REFERENCES proveedor (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE
    ) STRICT
  `,

  /*
   * El localizador solo es único entre artículos
   * activos. Los registros eliminados se conservan
   * como histórico y no bloquean la reutilización.
   */
  `
    CREATE UNIQUE INDEX
      uq_articulo_localizador_activo
    ON articulo (
      localizador
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE UNIQUE INDEX
      uq_articulo_nombre_activo
    ON articulo (
      nombre COLLATE NOCASE
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE UNIQUE INDEX
      uq_articulo_slug_activo
    ON articulo (
      slug COLLATE NOCASE
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE UNIQUE INDEX
      uq_articulo_acceso_directo_activo
    ON articulo (
      acceso_directo
    )
    WHERE
      acceso_directo IS NOT NULL
      AND deleted_at IS NULL
  `,

  /*
   * Un índice único no puede comprobar directamente
   * que una columna no coincida con otra columna de
   * otra fila.
   *
   * Estos triggers evitan situaciones ambiguas como:
   *
   * Artículo A:
   *   localizador = 1
   *
   * Artículo B:
   *   acceso_directo = 1
   */
  `
    CREATE TRIGGER
      trg_articulo_codigo_venta_insert
    BEFORE INSERT ON articulo
    WHEN NEW.deleted_at IS NULL
    BEGIN
      SELECT RAISE(
        ABORT,
        'El localizador o el acceso directo ya están asignados a otro artículo.'
      )
      WHERE
        (
          NEW.acceso_directo IS NOT NULL
          AND NEW.acceso_directo =
            NEW.localizador
        )
        OR EXISTS (
          SELECT 1
          FROM articulo AS articulo_existente
          WHERE
            articulo_existente.deleted_at
              IS NULL
            AND (
              articulo_existente.localizador =
                NEW.acceso_directo
              OR
              articulo_existente.acceso_directo =
                NEW.localizador
            )
        );
    END
  `,

  `
    CREATE TRIGGER
      trg_articulo_codigo_venta_update
    BEFORE UPDATE OF
      localizador,
      acceso_directo,
      deleted_at
    ON articulo
    WHEN NEW.deleted_at IS NULL
    BEGIN
      SELECT RAISE(
        ABORT,
        'El localizador o el acceso directo ya están asignados a otro artículo.'
      )
      WHERE
        (
          NEW.acceso_directo IS NOT NULL
          AND NEW.acceso_directo =
            NEW.localizador
        )
        OR EXISTS (
          SELECT 1
          FROM articulo AS articulo_existente
          WHERE
            articulo_existente.id <> OLD.id
            AND articulo_existente.deleted_at
              IS NULL
            AND (
              articulo_existente.localizador =
                NEW.acceso_directo
              OR
              articulo_existente.acceso_directo =
                NEW.localizador
            )
        );
    END
  `,

  `
    CREATE INDEX idx_articulo_nombre
    ON articulo (
      nombre COLLATE NOCASE
    )
  `,

  `
    CREATE INDEX idx_articulo_marca
    ON articulo (
      id_marca
    )
  `,

  `
    CREATE INDEX idx_articulo_proveedor
    ON articulo (
      id_proveedor
    )
  `,

  `
    CREATE INDEX idx_articulo_proveedor_referencia
    ON articulo (
      id_proveedor,
      referencia
    )
  `,

  `
    CREATE INDEX idx_articulo_stock
    ON articulo (
      stock
    )
  `,

  `
    CREATE INDEX
      idx_articulo_fecha_caducidad_activa
    ON articulo (
      fecha_caducidad
    )
    WHERE
      fecha_caducidad IS NOT NULL
      AND deleted_at IS NULL
  `,

  `
    CREATE TABLE articulo_categoria (
      id_articulo INTEGER NOT NULL,
      id_categoria INTEGER NOT NULL,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_articulo,
        id_categoria
      ),

      CONSTRAINT fk_articulo_categoria_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_articulo_categoria_categoria
        FOREIGN KEY (
          id_categoria
        )
        REFERENCES categoria (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_articulo_categoria_categoria
    ON articulo_categoria (
      id_categoria
    )
  `,

  `
    CREATE TABLE codigo_barras (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_articulo INTEGER NOT NULL,

      /*
       * Se conserva como texto porque algunos tipos
       * de códigos pueden contener ceros iniciales o
       * caracteres no numéricos.
       */
      codigo TEXT NOT NULL
        CHECK (
          codigo = trim(codigo)
          AND length(codigo)
            BETWEEN 1 AND 100
        ),

      por_defecto INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          por_defecto IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CONSTRAINT fk_codigo_barras_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  /*
   * Un código de barras activo solo puede pertenecer
   * a un artículo.
   *
   * Las anomalías existentes en el sistema antiguo
   * se resolverán antes de insertar la SQLite final.
   */
  `
    CREATE UNIQUE INDEX
      uq_codigo_barras_codigo_activo
    ON codigo_barras (
      codigo
    )
    WHERE deleted_at IS NULL
  `,

  /*
   * Cada artículo puede tener como máximo un código
   * marcado como predeterminado.
   */
  `
    CREATE UNIQUE INDEX
      uq_codigo_barras_predeterminado_activo
    ON codigo_barras (
      id_articulo
    )
    WHERE
      por_defecto = 1
      AND deleted_at IS NULL
  `,

  `
    CREATE INDEX idx_codigo_barras_articulo
    ON codigo_barras (
      id_articulo
    )
  `,

  `
    CREATE TABLE etiqueta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      texto TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          texto = trim(texto)
          AND length(texto)
            BETWEEN 1 AND 100
        ),

      slug TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          slug = trim(slug)
          AND length(slug)
            BETWEEN 1 AND 100
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT
    ) STRICT
  `,

  `
    CREATE UNIQUE INDEX uq_etiqueta_slug_activa
    ON etiqueta (
      slug COLLATE NOCASE
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE INDEX idx_etiqueta_texto
    ON etiqueta (
      texto COLLATE NOCASE
    )
  `,

  `
    CREATE TABLE articulo_etiqueta (
      id_articulo INTEGER NOT NULL,
      id_etiqueta INTEGER NOT NULL,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_articulo,
        id_etiqueta
      ),

      CONSTRAINT fk_articulo_etiqueta_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_articulo_etiqueta_etiqueta
        FOREIGN KEY (
          id_etiqueta
        )
        REFERENCES etiqueta (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_articulo_etiqueta_etiqueta
    ON articulo_etiqueta (
      id_etiqueta
    )
  `,

  `
    CREATE TABLE etiqueta_web (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      texto TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          texto = trim(texto)
          AND length(texto)
            BETWEEN 1 AND 100
        ),

      slug TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          slug = trim(slug)
          AND length(slug)
            BETWEEN 1 AND 100
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT
    ) STRICT
  `,

  `
    CREATE UNIQUE INDEX
      uq_etiqueta_web_slug_activa
    ON etiqueta_web (
      slug COLLATE NOCASE
    )
    WHERE deleted_at IS NULL
  `,

  `
    CREATE INDEX idx_etiqueta_web_texto
    ON etiqueta_web (
      texto COLLATE NOCASE
    )
  `,

  `
    CREATE TABLE articulo_etiqueta_web (
      id_articulo INTEGER NOT NULL,
      id_etiqueta_web INTEGER NOT NULL,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_articulo,
        id_etiqueta_web
      ),

      CONSTRAINT fk_articulo_etiqueta_web_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_articulo_etiqueta_web_etiqueta
        FOREIGN KEY (
          id_etiqueta_web
        )
        REFERENCES etiqueta_web (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX
      idx_articulo_etiqueta_web_etiqueta
    ON articulo_etiqueta_web (
      id_etiqueta_web
    )
  `,

  /*
   * Sustituye las tablas legacy:
   *
   * foto
   * articulo_foto
   */
  `
    CREATE TABLE articulo_archivo (
      id_articulo INTEGER NOT NULL,
      id_archivo INTEGER NOT NULL,

      tipo TEXT NOT NULL
        DEFAULT 'imagen'
        CHECK (
          tipo IN (
            'imagen',
            'manual',
            'ficha',
            'otro'
          )
        ),

      orden INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          orden >= 0
        ),

      principal INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          principal IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_articulo,
        id_archivo
      ),

      CONSTRAINT fk_articulo_archivo_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_articulo_archivo_archivo
        FOREIGN KEY (
          id_archivo
        )
        REFERENCES archivo (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE UNIQUE INDEX
      uq_articulo_archivo_principal
    ON articulo_archivo (
      id_articulo,
      tipo
    )
    WHERE principal = 1
  `,

  `
    CREATE INDEX idx_articulo_archivo_archivo
    ON articulo_archivo (
      id_archivo
    )
  `,

  `
    CREATE INDEX idx_articulo_archivo_orden
    ON articulo_archivo (
      id_articulo,
      tipo,
      orden
    )
  `,

  /*
   * Histórico de unidades que han caducado y han
   * tenido que ser retiradas del stock.
   *
   * No guarda relación funcional con
   * articulo.fecha_caducidad.
   */
  `
    CREATE TABLE merma_caducidad (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_articulo INTEGER NOT NULL,

      unidades INTEGER NOT NULL
        CHECK (
          unidades > 0
        ),

      /*
       * Precio unitario de compra que tenían las
       * unidades descartadas.
       */
      puc_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          puc_micros >= 0
        ),

      /*
       * Precio de venta que tenían las unidades
       * descartadas.
       */
      pvp_cents INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          pvp_cents >= 0
        ),

      /*
       * Momento en el que las unidades se dieron
       * de baja y se contabilizaron como pérdida.
       */
      fecha_baja TEXT NOT NULL,

      observaciones TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CONSTRAINT fk_merma_caducidad_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX
      idx_merma_caducidad_articulo_fecha
    ON merma_caducidad (
      id_articulo,
      fecha_baja
    )
  `,

  `
    CREATE INDEX
      idx_merma_caducidad_fecha_activa
    ON merma_caducidad (
      fecha_baja
    )
    WHERE deleted_at IS NULL
  `,
];

const inventoryDatabaseSchema: DatabaseSchemaDefinition = {
  name: 'inventory',
  statements,
};

export default inventoryDatabaseSchema;
