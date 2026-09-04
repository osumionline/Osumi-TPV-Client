import type DatabaseSchemaDefinition from '@infrastructure/database/schema/database-schema-definition.interface';
import { SQLITE_TIMESTAMP_DEFAULT } from '@infrastructure/database/schema/sqlite-schema.constants';

const statements: readonly string[] = [
  `
    CREATE TABLE venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_caja INTEGER NOT NULL,
      id_empleado INTEGER NOT NULL,
      id_cliente INTEGER,

      /*
       * Venta histórica cuyo ticket se cargó como
       * origen de una devolución.
       *
       * Es NULL para operaciones sin devolución.
       */
      id_venta_origen_devolucion INTEGER,

      /*
       * La serie permite separar numeraciones en
       * instalaciones futuras con varios terminales.
       */
      serie TEXT NOT NULL
        DEFAULT ''
        COLLATE NOCASE,

      numero INTEGER NOT NULL
        CHECK (
          numero > 0
        ),

      /*
       * El total puede ser negativo cuando la
       * operación completa representa una devolución.
       */
      total_cents INTEGER NOT NULL
        DEFAULT 0,

      /*
       * Revisión del contenido que debería representar
       * actualmente el ticket de la venta.
       *
       * Cualquier cambio documental posterior incrementa
       * esta revisión dentro de su misma transacción.
       */
      ticket_revision INTEGER NOT NULL
        DEFAULT 1
        CHECK (
          ticket_revision >= 1
        ),

      /*
       * Última revisión que sabemos materializada
       * correctamente en el PDF vigente.
       *
       * Cero significa que todavía no existe una
       * materialización confirmada.
       */
      ticket_pdf_revision INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          ticket_pdf_revision >= 0
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CHECK (
        ticket_pdf_revision <= ticket_revision
      ),
      UNIQUE (
        serie,
        numero
      ),

      CONSTRAINT fk_venta_caja
        FOREIGN KEY (
          id_caja
        )
        REFERENCES caja (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_venta_empleado
        FOREIGN KEY (
          id_empleado
        )
        REFERENCES empleado (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_venta_cliente
        FOREIGN KEY (
          id_cliente
        )
        REFERENCES cliente (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE,

      CONSTRAINT fk_venta_devolucion_origen
        FOREIGN KEY (
          id_venta_origen_devolucion
        )
        REFERENCES venta (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_venta_caja_fecha
    ON venta (
      id_caja,
      created_at
    )
  `,

  `
    CREATE INDEX idx_venta_empleado_fecha
    ON venta (
      id_empleado,
      created_at
    )
  `,

  `
    CREATE INDEX idx_venta_cliente_fecha
    ON venta (
      id_cliente,
      created_at
    )
    WHERE id_cliente IS NOT NULL
  `,

  `
    CREATE INDEX idx_venta_devolucion_origen
    ON venta (
      id_venta_origen_devolucion
    )
    WHERE id_venta_origen_devolucion IS NOT NULL
  `,

  `
    CREATE INDEX idx_venta_fecha_activa
    ON venta (
      created_at
    )
    WHERE deleted_at IS NULL
  `,

  /*
   * Una venta puede tener cualquier número de pagos.
   *
   * Ejemplo:
   *
   *   20 € efectivo
   *   30 € tarjeta
   *   10 € Bizum
   */
  `
    CREATE TABLE venta_pago (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_venta INTEGER NOT NULL,
      id_tipo_pago INTEGER NOT NULL,

      orden INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          orden >= 0
        ),

      /*
       * Cantidad del pago aplicada al total.
       *
       * Puede ser negativa en una devolución.
       */
      importe_cents INTEGER NOT NULL,

      /*
       * Cantidad entregada físicamente por el cliente.
       *
       * Es especialmente útil para el efectivo y puede
       * ser distinta del importe aplicado a la venta.
       */
      entregado_cents INTEGER,

      /*
       * Cambio devuelto al cliente.
       */
      cambio_cents INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          cambio_cents >= 0
        ),

      /*
       * Permite conservar el saldo resultante cuando
       * el medio de pago representa un vale o saldo.
       */
      saldo_resultante_cents INTEGER,

      /*
       * Referencia externa de una operación bancaria,
       * Bizum, PayPal, pasarela web, etc.
       */
      referencia TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      UNIQUE (
        id_venta,
        orden
      ),

      CONSTRAINT fk_venta_pago_venta
        FOREIGN KEY (
          id_venta
        )
        REFERENCES venta (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_venta_pago_tipo_pago
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
    CREATE INDEX idx_venta_pago_venta
    ON venta_pago (
      id_venta
    )
  `,

  `
    CREATE INDEX idx_venta_pago_tipo_pago_fecha
    ON venta_pago (
      id_tipo_pago,
      created_at
    )
  `,

  `
    CREATE TABLE linea_venta (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_venta INTEGER NOT NULL,

      /*
       * Puede ser NULL para conservar líneas libres,
       * ajustes, descuentos y artículos eliminados.
       */
      id_articulo INTEGER,

      /*
       * Línea histórica exacta que origina esta
       * devolución.
       *
       * Una misma línea original puede aparecer aquí
       * varias veces si se realizan devoluciones
       * parciales sucesivas.
       */
      id_linea_venta_origen_devolucion INTEGER,

      /*
       * Línea concreta de reserva de la que procede
       * esta línea cuando corresponda.
       */
      id_linea_reserva_origen INTEGER,

      /*
       * Snapshot histórico del localizador y la marca
       * que tenía el artículo al persistirse la línea.
       *
       * Para líneas Varios o artículos legacy que no
       * hayan podido recuperarse se utiliza localizador 0.
       */
      localizador INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          localizador >= 0
        ),

      marca TEXT NOT NULL
        DEFAULT 'Sin marca'
        COLLATE NOCASE
        CHECK (
          marca = trim(marca)
          AND length(marca)
            BETWEEN 1 AND 200
        ),

      nombre_articulo TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre_articulo =
            trim(nombre_articulo)
          AND length(nombre_articulo)
            BETWEEN 1 AND 200
        ),

      /*
       * Precio unitario de compra histórico.
       */
      puc_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          puc_micros >= 0
        ),

      /*
       * Precio unitario de venta histórico.
       *
       * Puede ser negativo para líneas de ajuste,
       * descuentos directos o bonos.
       */
      pvp_micros INTEGER NOT NULL
        DEFAULT 0,

      iva_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          iva_bps
          BETWEEN 0 AND 10000
        ),

      /*
       * Importe final de la línea.
       *
       * Se almacena en microeuros porque el sistema
       * antiguo contiene líneas con cuatro decimales.
       */
      importe_micros INTEGER NOT NULL
        DEFAULT 0,

      descuento_bps INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          descuento_bps
          BETWEEN 0 AND 10000
        ),

      importe_descuento_micros INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          importe_descuento_micros >= 0
        ),

      /*
       * Las unidades pueden ser negativas cuando la
       * línea representa una devolución.
       *
       * Se permite cero para conservar algunas líneas
       * históricas existentes.
       */
      unidades INTEGER NOT NULL
        DEFAULT 0,

      unidades_devueltas INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          unidades_devueltas >= 0
        ),

      regalo INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          regalo IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      /*
       * Una línea puede proceder de una devolución
       * o de una reserva, pero nunca de ambos orígenes
       * simultáneamente.
       */
      CHECK (
        id_linea_venta_origen_devolucion IS NULL
        OR id_linea_reserva_origen IS NULL
      ),

      CONSTRAINT fk_linea_venta_venta
        FOREIGN KEY (
          id_venta
        )
        REFERENCES venta (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_linea_venta_articulo
        FOREIGN KEY (
          id_articulo
        )
        REFERENCES articulo (
          id
        )
        ON DELETE SET NULL
        ON UPDATE CASCADE,

      CONSTRAINT fk_linea_venta_devolucion_origen
        FOREIGN KEY (
          id_linea_venta_origen_devolucion
        )
        REFERENCES linea_venta (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE,

      CONSTRAINT fk_linea_venta_reserva_origen
        FOREIGN KEY (
          id_linea_reserva_origen
        )
        REFERENCES linea_reserva (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_linea_venta_venta
    ON linea_venta (
      id_venta
    )
  `,

  `
    CREATE INDEX idx_linea_venta_articulo
    ON linea_venta (
      id_articulo
    )
    WHERE id_articulo IS NOT NULL
  `,

  `
    CREATE INDEX idx_linea_venta_devolucion_origen
    ON linea_venta (
      id_linea_venta_origen_devolucion
    )
    WHERE id_linea_venta_origen_devolucion IS NOT NULL
  `,

  `
    CREATE INDEX idx_linea_venta_reserva_origen
    ON linea_venta (
      id_linea_reserva_origen
    )
    WHERE id_linea_reserva_origen IS NOT NULL
  `,

  /*
   * Relación entre una venta y las reservas que
   * quedaron definitivamente resueltas por ella.
   *
   * Una venta puede consumir varias reservas.
   *
   * Una reserva solo puede ser consumida por una
   * única venta.
   */
  `
    CREATE TABLE venta_reserva (
      id_venta INTEGER NOT NULL,
      id_reserva INTEGER NOT NULL,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_venta,
        id_reserva
      ),

      UNIQUE (
        id_reserva
      ),

      CONSTRAINT fk_venta_reserva_venta
        FOREIGN KEY (
          id_venta
        )
        REFERENCES venta (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_venta_reserva_reserva
        FOREIGN KEY (
          id_reserva
        )
        REFERENCES reserva (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  /*
   * Información TicketBai asociada uno a uno
   * con una venta.
   */
  `
    CREATE TABLE venta_ticketbai (
      id_venta INTEGER PRIMARY KEY,

      /*
       * Entorno utilizado realmente para esta
       * identidad fiscal.
       *
       * Puede ser NULL para estados históricos
       * donde esa información no se conoce.
       */
      entorno TEXT
        CHECK (
          entorno IS NULL
          OR entorno IN (
            'test',
            'production'
          )
        ),

      /*
       * NIF que se utilizó realmente como emisor.
       *
       * No se reconstruye artificialmente en
       * registros legacy históricos.
       */
      nif_emisor TEXT,

      /*
       * Serie y número utilizados ante TicketBaiWS.
       *
       * Son independientes de la representación
       * documental interna de venta.
       */
      serie TEXT,
      numero TEXT,

      estado TEXT NOT NULL
      CHECK (
        estado IN (
          'no_aplica',
          'legacy',
          'pendiente',
          'enviando',
          'pendiente_remoto',
          'aceptada',
          'rechazada',
          'error_temporal',
          'error_permanente',
          'anulada'
        )
      ),

      identificador TEXT,

      huella TEXT
        CHECK (
          huella IS NULL
          OR length(huella) <= 250
        ),

      qr TEXT,
      url TEXT,

      intentos INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          intentos >= 0
        ),

      ultimo_error TEXT,

      /*
       * No se fuerza que sean JSON porque TicketBai
       * puede requerir almacenar XML u otros formatos.
       */
      solicitud_payload TEXT,
      respuesta_payload TEXT,

      enviado_at TEXT,
      aceptado_at TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      CONSTRAINT fk_venta_ticketbai_venta
        FOREIGN KEY (
          id_venta
        )
        REFERENCES venta (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE
    ) STRICT
  `,

  `
    CREATE INDEX idx_venta_ticketbai_estado
    ON venta_ticketbai (
      estado,
      updated_at
    )
  `,

  `
    CREATE INDEX idx_venta_ticketbai_identificador
    ON venta_ticketbai (
      identificador
    )
    WHERE identificador IS NOT NULL
  `,

  `
    CREATE UNIQUE INDEX
      uq_venta_ticketbai_identidad_fiscal
    ON venta_ticketbai (
      entorno,
      nif_emisor,
      serie,
      numero
    )
    WHERE
      entorno IS NOT NULL
      AND nif_emisor IS NOT NULL
      AND serie IS NOT NULL
      AND numero IS NOT NULL
  `,

  `
    CREATE TABLE factura (
      id INTEGER PRIMARY KEY AUTOINCREMENT,

      public_id TEXT NOT NULL
        UNIQUE,

      id_cliente INTEGER NOT NULL,

      serie TEXT NOT NULL
        DEFAULT ''
        COLLATE NOCASE,

      /*
       * Una factura en borrador todavía puede no
       * tener número.
       */
      numero INTEGER
        CHECK (
          numero IS NULL
          OR numero > 0
        ),

      estado TEXT NOT NULL
        DEFAULT 'borrador'
        CHECK (
          estado IN (
            'borrador',
            'emitida',
            'anulada'
          )
        ),

      /*
       * Instantánea de los datos de facturación.
       * No dependen de cambios posteriores del cliente.
       */
      nombre_apellidos TEXT NOT NULL
        COLLATE NOCASE
        CHECK (
          nombre_apellidos =
            trim(nombre_apellidos)
          AND length(nombre_apellidos)
            BETWEEN 1 AND 150
        ),

      dni_cif TEXT
        COLLATE NOCASE,

      telefono TEXT,

      email TEXT
        COLLATE NOCASE,

      direccion TEXT,
      codigo_postal TEXT,
      poblacion TEXT,

      id_provincia INTEGER
        CHECK (
          id_provincia IS NULL
          OR id_provincia > 0
        ),

      importe_cents INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          importe_cents >= 0
        ),

      impresa INTEGER NOT NULL
        DEFAULT 0
        CHECK (
          impresa IN (0, 1)
        ),

      fecha_emision TEXT,
      fecha_anulacion TEXT,

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      deleted_at TEXT,

      CHECK (
        (
          estado = 'borrador'
          AND numero IS NULL
          AND fecha_emision IS NULL
          AND fecha_anulacion IS NULL
        )
        OR (
          estado = 'emitida'
          AND numero IS NOT NULL
          AND fecha_emision IS NOT NULL
          AND fecha_anulacion IS NULL
        )
        OR (
          estado = 'anulada'
          AND numero IS NOT NULL
          AND fecha_emision IS NOT NULL
          AND fecha_anulacion IS NOT NULL
        )
      ),

      CONSTRAINT fk_factura_cliente
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

  /*
   * La numeración emitida no puede reutilizarse,
   * aunque una factura sea anulada posteriormente.
   */
  `
    CREATE UNIQUE INDEX
      uq_factura_serie_numero
    ON factura (
      serie,
      numero
    )
    WHERE numero IS NOT NULL
  `,

  `
    CREATE INDEX idx_factura_cliente_fecha
    ON factura (
      id_cliente,
      created_at
    )
  `,

  `
    CREATE INDEX idx_factura_estado_fecha
    ON factura (
      estado,
      created_at
    )
  `,

  `
    CREATE TABLE factura_venta (
      id_factura INTEGER NOT NULL,
      id_venta INTEGER NOT NULL,

      /*
       * Las relaciones de borradores y facturas
       * emitidas son activas.
       *
       * Al anular una factura se conservan como
       * histórico, pero dejan de bloquear la venta.
       */
      activa INTEGER NOT NULL
        DEFAULT 1
        CHECK (
          activa IN (0, 1)
        ),

      created_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      updated_at TEXT NOT NULL
        DEFAULT (${SQLITE_TIMESTAMP_DEFAULT}),

      PRIMARY KEY (
        id_factura,
        id_venta
      ),

      CONSTRAINT fk_factura_venta_factura
        FOREIGN KEY (
          id_factura
        )
        REFERENCES factura (
          id
        )
        ON DELETE CASCADE
        ON UPDATE CASCADE,

      CONSTRAINT fk_factura_venta_venta
        FOREIGN KEY (
          id_venta
        )
        REFERENCES venta (
          id
        )
        ON DELETE RESTRICT
        ON UPDATE CASCADE
    ) STRICT
  `,

  /*
   * Una venta puede conservar varias relaciones
   * históricas, pero como máximo una activa.
   */
  `
    CREATE UNIQUE INDEX
      uq_factura_venta_venta_activa
    ON factura_venta (
      id_venta
    )
    WHERE activa = 1
  `,

  `
    CREATE INDEX idx_factura_venta_factura
    ON factura_venta (
      id_factura
    )
  `,
];

const salesDatabaseSchema: DatabaseSchemaDefinition = {
  name: 'sales',
  statements,
};

export default salesDatabaseSchema;
