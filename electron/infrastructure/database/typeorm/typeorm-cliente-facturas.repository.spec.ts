import type { ClienteFacturaDocumentoRecord } from '@backend/domain/clientes/cliente-factura-documento-record.interface';
import type { ClienteFacturaRecord } from '@backend/domain/clientes/cliente-factura-record.interface';
import type {
  ClienteFacturaVentaDisponibleRecord,
  ClienteFacturaVentaRecord,
} from '@backend/domain/clientes/cliente-factura-venta-record.interface';
import completeDatabaseSchema from '@infrastructure/database/schema/complete-database-schema';
import TypeOrmApplicationDatabase from '@infrastructure/database/typeorm/typeorm-application-database';
import TypeOrmClienteFacturasRepository from '@infrastructure/database/typeorm/typeorm-cliente-facturas.repository';
import TypeOrmDataSourceFactory from '@infrastructure/database/typeorm/typeorm-data-source.factory';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { DataSource } from 'typeorm';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

let tempDirectory: string | null = null;
let applicationDatabase: TypeOrmApplicationDatabase | null = null;
let repository: TypeOrmClienteFacturasRepository | null = null;

interface ClienteFacturaBorradorDatabaseRow {
  readonly public_id: string;
  readonly nombre_apellidos: string;
  readonly dni_cif: string | null;
  readonly telefono: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly codigo_postal: string | null;
  readonly poblacion: string | null;
  readonly id_provincia: number | null;
  readonly importe_cents: number;
  readonly estado: string;
  readonly numero: number | null;
  readonly fecha_emision: string | null;
  readonly fecha_anulacion: string | null;
  readonly deleted_at: string | null;
}

interface ClienteFacturaVentaRelacionDatabaseRow {
  readonly public_id: string;
  readonly activa: number;
}

interface ClienteFacturaBorradorActualizadoDatabaseRow {
  readonly nombre_apellidos: string;
  readonly dni_cif: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly importe_cents: number;
  readonly created_at: string;
  readonly updated_at: string;
}

interface ClienteFacturaBorradorEliminadoDatabaseRow {
  readonly estado: string;
  readonly updated_at: string;
  readonly deleted_at: string | null;
}

interface ClienteFacturaEmitidaDatabaseRow {
  readonly serie: string;
  readonly numero: number;
  readonly estado: string;
  readonly nombre_apellidos: string;
  readonly dni_cif: string | null;
  readonly email: string | null;
  readonly direccion: string | null;
  readonly importe_cents: number;
  readonly fecha_emision: string;
  readonly fecha_anulacion: string | null;
}

interface ClienteFacturaSecuenciaDatabaseRow {
  readonly ultimo_numero: number;
}

interface ClienteFacturaAnuladaDatabaseRow {
  readonly numero: number;
  readonly estado: string;
  readonly nombre_apellidos: string;
  readonly importe_cents: number;
  readonly fecha_emision: string;
  readonly fecha_anulacion: string | null;
  readonly deleted_at: string | null;
}

describe('TypeOrmClienteFacturasRepository', (): void => {
  beforeEach(async (): Promise<void> => {
    tempDirectory = await mkdtemp(join(tmpdir(), 'osumi-tpv-cliente-facturas-'));

    applicationDatabase = new TypeOrmApplicationDatabase(
      join(tempDirectory, 'cliente-facturas.sqlite'),
      new TypeOrmDataSourceFactory(),
    );

    const dataSource: DataSource = await applicationDatabase.connect();

    await createSchema(dataSource);
    await seedFacturas(dataSource);
    await seedVentas(dataSource);

    repository = new TypeOrmClienteFacturasRepository(applicationDatabase);
  });

  afterEach(async (): Promise<void> => {
    if (applicationDatabase !== null) {
      await applicationDatabase.disconnect();
    }

    if (tempDirectory !== null) {
      await rm(tempDirectory, {
        recursive: true,
        force: true,
      });
    }

    repository = null;
    applicationDatabase = null;
    tempDirectory = null;
  });

  it('recupera borradores, emitidas y anuladas usando la fecha correspondiente', async (): Promise<void> => {
    const result: readonly ClienteFacturaRecord[] =
      await requireRepository().findByClientePublicId('cliente-1');

    expect(result).toEqual([
      {
        publicId: 'factura-borrador',
        serie: '',
        numero: null,
        year: null,
        estado: 'borrador',
        importeCents: 5_000,
        fechaCreacion: '2026-09-04T10:00:00.000Z',
        fechaEmision: null,
        fechaAnulacion: null,
      },
      {
        publicId: 'factura-emitida',
        serie: '',
        numero: 7,
        year: 2026,
        estado: 'emitida',
        importeCents: 12_345,
        fechaCreacion: '2026-08-19T10:00:00.000Z',
        fechaEmision: '2026-08-20 09:00:00',
        fechaAnulacion: null,
      },
      {
        publicId: 'factura-anulada',
        serie: '',
        numero: 6,
        year: 2026,
        estado: 'anulada',
        importeCents: 8_750,
        fechaCreacion: '2026-07-14T10:00:00.000Z',
        fechaEmision: '2026-07-15T09:00:00.000Z',
        fechaAnulacion: '2026-09-03T12:00:00.000Z',
      },
    ]);
  });

  it('excluye borradores eliminados y facturas de otros clientes', async (): Promise<void> => {
    const result: readonly ClienteFacturaRecord[] =
      await requireRepository().findByClientePublicId('cliente-1');

    expect(result.map((factura: ClienteFacturaRecord): string => factura.publicId)).toEqual([
      'factura-borrador',
      'factura-emitida',
      'factura-anulada',
    ]);
  });

  it('devuelve una colección vacía para clientes inexistentes o inactivos', async (): Promise<void> => {
    expect(await requireRepository().findByClientePublicId('cliente-inexistente')).toEqual([]);

    expect(await requireRepository().findByClientePublicId('cliente-inactivo')).toEqual([]);
  });

  it('crea un borrador transaccional con los datos actuales y el importe recalculado', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await dataSource.query(`
      UPDATE cliente
      SET
        datos_facturacion_iguales = 0,
        fact_nombre_apellidos = 'Facturación principal',
        fact_dni_cif = 'B12345678',
        fact_telefono = '944000000',
        fact_email = 'facturacion@example.com',
        fact_direccion = 'Gran Vía 1',
        fact_codigo_postal = '48001',
        fact_poblacion = 'Bilbao',
        fact_id_provincia = 48
      WHERE public_id = 'cliente-1'
    `);

    const result: ClienteFacturaRecord = await requireRepository().createBorrador({
      clientePublicId: 'cliente-1',
      ventasPublicIds: ['venta-disponible', 'venta-historica'],
    });

    expect(result.publicId).not.toBe('');
    expect(result).toEqual({
      publicId: result.publicId,
      serie: '',
      numero: null,
      year: null,
      estado: 'borrador',
      importeCents: 2_500,
      fechaCreacion: result.fechaCreacion,
      fechaEmision: null,
      fechaAnulacion: null,
    });

    const facturas: readonly ClienteFacturaBorradorDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            public_id,
            nombre_apellidos,
            dni_cif,
            telefono,
            email,
            direccion,
            codigo_postal,
            poblacion,
            id_provincia,
            importe_cents,
            estado,
            numero,
            fecha_emision,
            fecha_anulacion,
            deleted_at
          FROM factura
          WHERE public_id = ?
        `,
      [result.publicId],
    )) as readonly ClienteFacturaBorradorDatabaseRow[];

    expect(facturas).toEqual([
      {
        public_id: result.publicId,
        nombre_apellidos: 'Facturación principal',
        dni_cif: 'B12345678',
        telefono: '944000000',
        email: 'facturacion@example.com',
        direccion: 'Gran Vía 1',
        codigo_postal: '48001',
        poblacion: 'Bilbao',
        id_provincia: 48,
        importe_cents: 2_500,
        estado: 'borrador',
        numero: null,
        fecha_emision: null,
        fecha_anulacion: null,
        deleted_at: null,
      },
    ]);

    const relaciones: readonly ClienteFacturaVentaRelacionDatabaseRow[] = (await dataSource.query(
      `
          SELECT
            v.public_id,
            fv.activa
          FROM factura_venta fv

          INNER JOIN factura f
            ON f.id = fv.id_factura

          INNER JOIN venta v
            ON v.id = fv.id_venta

          WHERE f.public_id = ?

          ORDER BY v.public_id
        `,
      [result.publicId],
    )) as readonly ClienteFacturaVentaRelacionDatabaseRow[];

    expect(relaciones).toEqual([
      {
        public_id: 'venta-disponible',
        activa: 1,
      },
      {
        public_id: 'venta-historica',
        activa: 1,
      },
    ]);
  });

  it('rechaza borradores vacíos, ventas duplicadas y ventas no disponibles sin persistir nada', async (): Promise<void> => {
    const initialCount: number = await countFacturas();

    await expect(
      requireRepository().createBorrador({
        clientePublicId: 'cliente-1',
        ventasPublicIds: [],
      }),
    ).rejects.toThrow('La factura debe incluir al menos una venta.');

    await expect(
      requireRepository().createBorrador({
        clientePublicId: 'cliente-1',
        ventasPublicIds: ['venta-disponible', 'venta-disponible'],
      }),
    ).rejects.toThrow('Una venta no se puede incluir más de una vez en la misma factura.');

    await expect(
      requireRepository().createBorrador({
        clientePublicId: 'cliente-1',
        ventasPublicIds: ['venta-disponible', 'venta-facturada'],
      }),
    ).rejects.toThrow('Alguna de las ventas seleccionadas ya no está disponible para facturar.');

    expect(await countFacturas()).toBe(initialCount);
  });

  it('rechaza la creación para clientes inexistentes o inactivos', async (): Promise<void> => {
    const initialCount: number = await countFacturas();

    await expect(
      requireRepository().createBorrador({
        clientePublicId: 'cliente-inexistente',
        ventasPublicIds: ['venta-disponible'],
      }),
    ).rejects.toThrow('El cliente indicado no existe o ya no está activo.');

    await expect(
      requireRepository().createBorrador({
        clientePublicId: 'cliente-inactivo',
        ventasPublicIds: ['venta-cliente-inactivo'],
      }),
    ).rejects.toThrow('El cliente indicado no existe o ya no está activo.');

    expect(await countFacturas()).toBe(initialCount);
  });

  it('actualiza un borrador conservando, añadiendo y retirando ventas', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await dataSource.query(`
      UPDATE cliente
      SET
        nombre_apellidos = 'Cliente actualizado',
        dni_cif = '12345678Z',
        email = 'actualizado@example.com',
        direccion = 'Nueva dirección 2',
        datos_facturacion_iguales = 1
      WHERE public_id = 'cliente-1'
    `);

    const firstResult: ClienteFacturaRecord = await requireRepository().updateBorrador({
      clientePublicId: 'cliente-1',
      borradorPublicId: 'factura-borrador',
      ventasPublicIds: ['venta-borrador', 'venta-disponible'],
    });

    expect(firstResult).toEqual({
      publicId: 'factura-borrador',
      serie: '',
      numero: null,
      year: null,
      estado: 'borrador',
      importeCents: 3_000,
      fechaCreacion: '2026-09-04T10:00:00.000Z',
      fechaEmision: null,
      fechaAnulacion: null,
    });

    const result: ClienteFacturaRecord = await requireRepository().updateBorrador({
      clientePublicId: 'cliente-1',
      borradorPublicId: 'factura-borrador',
      ventasPublicIds: ['venta-historica'],
    });

    expect(result).toEqual({
      publicId: 'factura-borrador',
      serie: '',
      numero: null,
      year: null,
      estado: 'borrador',
      importeCents: 1_500,
      fechaCreacion: '2026-09-04T10:00:00.000Z',
      fechaEmision: null,
      fechaAnulacion: null,
    });

    const facturas: readonly ClienteFacturaBorradorActualizadoDatabaseRow[] =
      (await dataSource.query(`
        SELECT
          nombre_apellidos,
          dni_cif,
          email,
          direccion,
          importe_cents,
          created_at,
          updated_at
        FROM factura
        WHERE public_id = 'factura-borrador'
      `)) as readonly ClienteFacturaBorradorActualizadoDatabaseRow[];

    expect(facturas).toHaveLength(1);
    expect(facturas[0]?.nombre_apellidos).toBe('Cliente actualizado');
    expect(facturas[0]?.dni_cif).toBe('12345678Z');
    expect(facturas[0]?.email).toBe('actualizado@example.com');
    expect(facturas[0]?.direccion).toBe('Nueva dirección 2');
    expect(facturas[0]?.importe_cents).toBe(1_500);
    expect(facturas[0]?.created_at).toBe('2026-09-04T10:00:00.000Z');

    const relaciones: readonly ClienteFacturaVentaRelacionDatabaseRow[] = (await dataSource.query(`
        SELECT
          v.public_id,
          fv.activa
        FROM factura_venta fv

        INNER JOIN factura f
          ON f.id = fv.id_factura

        INNER JOIN venta v
          ON v.id = fv.id_venta

        WHERE f.public_id = 'factura-borrador'

        ORDER BY v.public_id
      `)) as readonly ClienteFacturaVentaRelacionDatabaseRow[];

    expect(relaciones).toEqual([
      {
        public_id: 'venta-historica',
        activa: 1,
      },
    ]);

    const disponibles: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', null);

    const disponiblesPublicIds: readonly string[] = disponibles.map(
      (venta: ClienteFacturaVentaDisponibleRecord): string => venta.publicId,
    );

    expect(disponiblesPublicIds).toContain('venta-borrador');
    expect(disponiblesPublicIds).toContain('venta-disponible');
    expect(disponiblesPublicIds).not.toContain('venta-historica');
  });

  it('conserva intacto el borrador cuando alguna venta ya no está disponible', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await expect(
      requireRepository().updateBorrador({
        clientePublicId: 'cliente-1',
        borradorPublicId: 'factura-borrador',
        ventasPublicIds: ['venta-borrador', 'venta-facturada'],
      }),
    ).rejects.toThrow('Alguna de las ventas seleccionadas ya no está disponible para facturar.');

    const facturas: readonly { readonly importe_cents: number }[] = (await dataSource.query(`
        SELECT importe_cents
        FROM factura
        WHERE public_id = 'factura-borrador'
      `)) as readonly { readonly importe_cents: number }[];

    expect(facturas).toEqual([
      {
        importe_cents: 5_000,
      },
    ]);

    const relaciones: readonly ClienteFacturaVentaRelacionDatabaseRow[] = (await dataSource.query(`
        SELECT
          v.public_id,
          fv.activa
        FROM factura_venta fv

        INNER JOIN factura f
          ON f.id = fv.id_factura

        INNER JOIN venta v
          ON v.id = fv.id_venta

        WHERE f.public_id = 'factura-borrador'
      `)) as readonly ClienteFacturaVentaRelacionDatabaseRow[];

    expect(relaciones).toEqual([
      {
        public_id: 'venta-borrador',
        activa: 1,
      },
    ]);
  });

  it('rechaza la actualización de facturas no editables o pertenecientes a otro cliente', async (): Promise<void> => {
    const nonEditablePublicIds: readonly string[] = [
      'factura-emitida',
      'factura-anulada',
      'factura-borrador-eliminado',
      'factura-otro-cliente',
    ];

    for (const borradorPublicId of nonEditablePublicIds) {
      await expect(
        requireRepository().updateBorrador({
          clientePublicId: 'cliente-1',
          borradorPublicId,
          ventasPublicIds: ['venta-disponible'],
        }),
      ).rejects.toThrow('El borrador de factura no pertenece al cliente o ya no está disponible.');
    }
  });

  it('elimina lógicamente un borrador, borra sus relaciones y libera sus ventas', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await requireRepository().deleteBorrador({
      clientePublicId: 'cliente-1',
      borradorPublicId: 'factura-borrador',
    });

    const facturas: readonly ClienteFacturaBorradorEliminadoDatabaseRow[] =
      (await dataSource.query(`
        SELECT
          estado,
          updated_at,
          deleted_at
        FROM factura
        WHERE public_id = 'factura-borrador'
      `)) as readonly ClienteFacturaBorradorEliminadoDatabaseRow[];

    expect(facturas).toHaveLength(1);
    expect(facturas[0]?.estado).toBe('borrador');
    expect(facturas[0]?.deleted_at).not.toBeNull();
    expect(facturas[0]?.updated_at).toBe(facturas[0]?.deleted_at);

    const relaciones: readonly ClienteFacturaVentaRelacionDatabaseRow[] = (await dataSource.query(`
        SELECT
          v.public_id,
          fv.activa
        FROM factura_venta fv

        INNER JOIN venta v
          ON v.id = fv.id_venta

        INNER JOIN factura f
          ON f.id = fv.id_factura

        WHERE f.public_id = 'factura-borrador'
      `)) as readonly ClienteFacturaVentaRelacionDatabaseRow[];

    expect(relaciones).toEqual([]);

    const facturasCliente: readonly ClienteFacturaRecord[] =
      await requireRepository().findByClientePublicId('cliente-1');

    expect(
      facturasCliente.some(
        (factura: ClienteFacturaRecord): boolean => factura.publicId === 'factura-borrador',
      ),
    ).toBe(false);

    const disponibles: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', null);

    expect(
      disponibles.some(
        (venta: ClienteFacturaVentaDisponibleRecord): boolean =>
          venta.publicId === 'venta-borrador',
      ),
    ).toBe(true);
  });

  it('rechaza la eliminación de facturas no editables o pertenecientes a otro cliente', async (): Promise<void> => {
    const nonEditablePublicIds: readonly string[] = [
      'factura-emitida',
      'factura-anulada',
      'factura-borrador-eliminado',
      'factura-otro-cliente',
    ];

    for (const borradorPublicId of nonEditablePublicIds) {
      await expect(
        requireRepository().deleteBorrador({
          clientePublicId: 'cliente-1',
          borradorPublicId,
        }),
      ).rejects.toThrow('El borrador de factura no pertenece al cliente o ya no está disponible.');
    }

    const dataSource: DataSource = await requireDataSource();

    const relaciones: readonly ClienteFacturaVentaRelacionDatabaseRow[] = (await dataSource.query(`
        SELECT
          v.public_id,
          fv.activa
        FROM factura_venta fv

        INNER JOIN venta v
          ON v.id = fv.id_venta

        INNER JOIN factura f
          ON f.id = fv.id_factura

        WHERE f.public_id = 'factura-borrador'
      `)) as readonly ClienteFacturaVentaRelacionDatabaseRow[];

    expect(relaciones).toEqual([
      {
        public_id: 'venta-borrador',
        activa: 1,
      },
    ]);
  });

  it('rechaza la eliminación cuando el cliente ya no está activo', async (): Promise<void> => {
    await expect(
      requireRepository().deleteBorrador({
        clientePublicId: 'cliente-inactivo',
        borradorPublicId: 'factura-cliente-inactivo',
      }),
    ).rejects.toThrow('El cliente indicado no existe o ya no está activo.');
  });

  it('emite un borrador congelando los datos actuales y consumiendo la secuencia global', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await dataSource.query(`
      UPDATE cliente
      SET
        datos_facturacion_iguales = 0,
        fact_nombre_apellidos = 'Facturación definitiva',
        fact_dni_cif = 'B87654321',
        fact_email = 'definitiva@example.com',
        fact_direccion = 'Calle definitiva 10'
      WHERE public_id = 'cliente-1'
    `);

    /*
     * Simula facturaInicial = 25.
     * La secuencia conserva el último utilizado, por
     * lo que antes de emitir debe contener 24.
     */
    await dataSource.query(`
      INSERT INTO secuencia_documento (
        tipo,
        serie,
        ultimo_numero
      )
      VALUES (
        'factura',
        '',
        24
      )
    `);

    const result: ClienteFacturaRecord = await requireRepository().emitBorrador({
      clientePublicId: 'cliente-1',
      borradorPublicId: 'factura-borrador',
    });

    expect(result.estado).toBe('emitida');
    expect(result.numero).toBe(25);
    expect(result.serie).toBe('');
    expect(result.importeCents).toBe(2_000);
    expect(result.fechaEmision).not.toBeNull();
    expect(result.fechaAnulacion).toBeNull();

    const fechaEmision: string | null = result.fechaEmision;

    if (fechaEmision === null) {
      throw new Error('La prueba esperaba una fecha de emisión.');
    }

    expect(result.year).toBe(Number(fechaEmision.slice(0, 4)));

    const facturas: readonly ClienteFacturaEmitidaDatabaseRow[] = (await dataSource.query(`
      SELECT
        serie,
        numero,
        estado,
        nombre_apellidos,
        dni_cif,
        email,
        direccion,
        importe_cents,
        fecha_emision,
        fecha_anulacion
      FROM factura
      WHERE public_id = 'factura-borrador'
    `)) as readonly ClienteFacturaEmitidaDatabaseRow[];

    expect(facturas).toEqual([
      {
        serie: '',
        numero: 25,
        estado: 'emitida',
        nombre_apellidos: 'Facturación definitiva',
        dni_cif: 'B87654321',
        email: 'definitiva@example.com',
        direccion: 'Calle definitiva 10',
        importe_cents: 2_000,
        fecha_emision: fechaEmision,
        fecha_anulacion: null,
      },
    ]);

    const secuencias: readonly ClienteFacturaSecuenciaDatabaseRow[] = (await dataSource.query(`
      SELECT ultimo_numero
      FROM secuencia_documento
      WHERE
        tipo = 'factura'
        AND serie = ''
    `)) as readonly ClienteFacturaSecuenciaDatabaseRow[];

    expect(secuencias).toEqual([
      {
        ultimo_numero: 25,
      },
    ]);

    const relaciones: readonly ClienteFacturaVentaRelacionDatabaseRow[] = (await dataSource.query(`
        SELECT
          v.public_id,
          fv.activa
        FROM factura_venta fv

        INNER JOIN factura f
          ON f.id = fv.id_factura

        INNER JOIN venta v
          ON v.id = fv.id_venta

        WHERE f.public_id = 'factura-borrador'
      `)) as readonly ClienteFacturaVentaRelacionDatabaseRow[];

    expect(relaciones).toEqual([
      {
        public_id: 'venta-borrador',
        activa: 1,
      },
    ]);
  });

  it('sincroniza la secuencia con el máximo histórico antes de emitir', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    const result: ClienteFacturaRecord = await requireRepository().emitBorrador({
      clientePublicId: 'cliente-1',
      borradorPublicId: 'factura-borrador',
    });

    /*
     * El fixture ya contiene una factura histórica
     * número 9. Sin secuencia inicial explícita, el
     * siguiente número debe ser 10 y nunca 1.
     */
    expect(result.numero).toBe(10);

    const secuencias: readonly ClienteFacturaSecuenciaDatabaseRow[] = (await dataSource.query(`
      SELECT ultimo_numero
      FROM secuencia_documento
      WHERE
        tipo = 'factura'
        AND serie = ''
    `)) as readonly ClienteFacturaSecuenciaDatabaseRow[];

    expect(secuencias).toEqual([
      {
        ultimo_numero: 10,
      },
    ]);
  });

  it('no consume numeración ni modifica el borrador cuando una venta deja de ser elegible', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await dataSource.query(`
      INSERT INTO secuencia_documento (
        tipo,
        serie,
        ultimo_numero
      )
      VALUES (
        'factura',
        '',
        30
      )
    `);

    /*
     * La venta pertenecía al cliente cuando se añadió
     * al borrador, pero cambia antes de la emisión.
     */
    await dataSource.query(`
      UPDATE venta
      SET id_cliente = 2
      WHERE public_id = 'venta-borrador'
    `);

    await expect(
      requireRepository().emitBorrador({
        clientePublicId: 'cliente-1',
        borradorPublicId: 'factura-borrador',
      }),
    ).rejects.toThrow('Alguna de las ventas seleccionadas ya no está disponible para facturar.');

    const facturas: readonly {
      readonly numero: number | null;
      readonly estado: string;
      readonly fecha_emision: string | null;
      readonly importe_cents: number;
    }[] = (await dataSource.query(`
      SELECT
        numero,
        estado,
        fecha_emision,
        importe_cents
      FROM factura
      WHERE public_id = 'factura-borrador'
    `)) as readonly {
      readonly numero: number | null;
      readonly estado: string;
      readonly fecha_emision: string | null;
      readonly importe_cents: number;
    }[];

    expect(facturas).toEqual([
      {
        numero: null,
        estado: 'borrador',
        fecha_emision: null,
        importe_cents: 5_000,
      },
    ]);

    const secuencias: readonly ClienteFacturaSecuenciaDatabaseRow[] = (await dataSource.query(`
      SELECT ultimo_numero
      FROM secuencia_documento
      WHERE
        tipo = 'factura'
        AND serie = ''
    `)) as readonly ClienteFacturaSecuenciaDatabaseRow[];

    expect(secuencias).toEqual([
      {
        ultimo_numero: 30,
      },
    ]);
  });

  it('rechaza emitir facturas finalizadas, eliminadas o pertenecientes a otro cliente', async (): Promise<void> => {
    const nonEditablePublicIds: readonly string[] = [
      'factura-emitida',
      'factura-anulada',
      'factura-borrador-eliminado',
      'factura-otro-cliente',
    ];

    for (const borradorPublicId of nonEditablePublicIds) {
      await expect(
        requireRepository().emitBorrador({
          clientePublicId: 'cliente-1',
          borradorPublicId,
        }),
      ).rejects.toThrow('El borrador de factura no pertenece al cliente o ya no está disponible.');
    }
  });

  it('crea y emite atómicamente una factura formada por una única venta', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();
    const initialCount: number = await countFacturas();

    await dataSource.query(`
      UPDATE cliente
      SET
        datos_facturacion_iguales = 0,
        fact_nombre_apellidos = 'Facturación principal',
        fact_dni_cif = 'B12345678',
        fact_telefono = '944000000',
        fact_email = 'facturacion@example.com',
        fact_direccion = 'Gran Vía 1',
        fact_codigo_postal = '48001',
        fact_poblacion = 'Bilbao',
        fact_id_provincia = 48
      WHERE public_id = 'cliente-1'
    `);

    /*
     * Simula facturaInicial = 25.
     */
    await dataSource.query(`
    INSERT INTO secuencia_documento (
      tipo,
      serie,
      ultimo_numero
    )
    VALUES (
      'factura',
      '',
      24
    )
  `);

    const result: ClienteFacturaRecord = await requireRepository().createEmitidaFromVenta({
      clientePublicId: 'cliente-1',
      ventaPublicId: 'venta-disponible',
    });

    expect(result.publicId).not.toBe('');
    expect(result.estado).toBe('emitida');
    expect(result.serie).toBe('');
    expect(result.numero).toBe(25);
    expect(result.year).toBe(Number(result.fechaEmision?.slice(0, 4)));
    expect(result.importeCents).toBe(1_000);
    expect(result.fechaEmision).not.toBeNull();
    expect(result.fechaAnulacion).toBeNull();

    expect(await countFacturas()).toBe(initialCount + 1);

    const facturas: readonly ClienteFacturaEmitidaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          serie,
          numero,
          estado,
          nombre_apellidos,
          dni_cif,
          email,
          direccion,
          importe_cents,
          fecha_emision,
          fecha_anulacion
        FROM factura
        WHERE public_id = ?
      `,
      [result.publicId],
    )) as readonly ClienteFacturaEmitidaDatabaseRow[];

    expect(facturas).toEqual([
      {
        serie: '',
        numero: 25,
        estado: 'emitida',
        nombre_apellidos: 'Facturación principal',
        dni_cif: 'B12345678',
        email: 'facturacion@example.com',
        direccion: 'Gran Vía 1',
        importe_cents: 1_000,
        fecha_emision: result.fechaEmision,
        fecha_anulacion: null,
      },
    ]);

    const relaciones: readonly ClienteFacturaVentaRelacionDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          v.public_id,
          fv.activa
        FROM factura_venta fv

        INNER JOIN venta v
          ON v.id = fv.id_venta

        INNER JOIN factura f
          ON f.id = fv.id_factura

        WHERE f.public_id = ?
      `,
      [result.publicId],
    )) as readonly ClienteFacturaVentaRelacionDatabaseRow[];

    expect(relaciones).toEqual([
      {
        public_id: 'venta-disponible',
        activa: 1,
      },
    ]);

    const disponibles: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', null);

    expect(
      disponibles.some(
        (venta: ClienteFacturaVentaDisponibleRecord): boolean =>
          venta.publicId === 'venta-disponible',
      ),
    ).toBe(false);
  });

  it('no deja borrador ni consume numeración cuando la venta no puede facturarse', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();
    const initialCount: number = await countFacturas();

    await dataSource.query(`
    INSERT INTO secuencia_documento (
      tipo,
      serie,
      ultimo_numero
    )
    VALUES (
      'factura',
      '',
      24
    )
  `);

    await expect(
      requireRepository().createEmitidaFromVenta({
        clientePublicId: 'cliente-1',
        ventaPublicId: 'venta-facturada',
      }),
    ).rejects.toThrow('Alguna de las ventas seleccionadas ya no está disponible para facturar.');

    expect(await countFacturas()).toBe(initialCount);

    const secuencias: readonly ClienteFacturaSecuenciaDatabaseRow[] = (await dataSource.query(
      `
        SELECT ultimo_numero
        FROM secuencia_documento
        WHERE
          tipo = 'factura'
          AND serie = ''
      `,
    )) as readonly ClienteFacturaSecuenciaDatabaseRow[];

    expect(secuencias).toEqual([
      {
        ultimo_numero: 24,
      },
    ]);
  });

  it('anula una factura emitida conservando su identidad y libera sus ventas', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    const result: ClienteFacturaRecord = await requireRepository().anularFactura({
      clientePublicId: 'cliente-1',
      facturaPublicId: 'factura-emitida',
    });

    expect(result).toEqual({
      publicId: 'factura-emitida',
      serie: '',
      numero: 7,
      year: 2026,
      estado: 'anulada',
      importeCents: 12_345,
      fechaCreacion: '2026-08-19T10:00:00.000Z',
      fechaEmision: '2026-08-20 09:00:00',
      fechaAnulacion: result.fechaAnulacion,
    });

    expect(result.fechaAnulacion).not.toBeNull();

    const facturas: readonly ClienteFacturaAnuladaDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          numero,
          estado,
          nombre_apellidos,
          importe_cents,
          fecha_emision,
          fecha_anulacion,
          deleted_at
        FROM factura
        WHERE public_id = 'factura-emitida'
      `,
    )) as readonly ClienteFacturaAnuladaDatabaseRow[];

    expect(facturas).toEqual([
      {
        numero: 7,
        estado: 'anulada',
        nombre_apellidos: 'Cliente principal',
        importe_cents: 12_345,
        fecha_emision: '2026-08-20 09:00:00',
        fecha_anulacion: result.fechaAnulacion,
        deleted_at: null,
      },
    ]);

    const relaciones: readonly ClienteFacturaVentaRelacionDatabaseRow[] = (await dataSource.query(
      `
        SELECT
          v.public_id,
          fv.activa
        FROM factura_venta fv

        INNER JOIN venta v
          ON v.id = fv.id_venta

        INNER JOIN factura f
          ON f.id = fv.id_factura

        WHERE f.public_id = 'factura-emitida'
      `,
    )) as readonly ClienteFacturaVentaRelacionDatabaseRow[];

    expect(relaciones).toEqual([
      {
        public_id: 'venta-facturada',
        activa: 0,
      },
    ]);

    const disponibles: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', null);

    expect(
      disponibles.some(
        (venta: ClienteFacturaVentaDisponibleRecord): boolean =>
          venta.publicId === 'venta-facturada',
      ),
    ).toBe(true);

    const historicas: readonly ClienteFacturaVentaRecord[] =
      await requireRepository().findVentasByFacturaPublicId('cliente-1', 'factura-emitida');

    expect(historicas.map((venta: ClienteFacturaVentaRecord): string => venta.publicId)).toEqual([
      'venta-facturada',
    ]);
  });

  it('revierte la anulación si la factura emitida no tiene relaciones activas', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await dataSource.query(
      `
      UPDATE factura_venta
      SET activa = 0
      WHERE id_factura = 1
    `,
    );

    await expect(
      requireRepository().anularFactura({
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-emitida',
      }),
    ).rejects.toThrow('La factura emitida no contiene ventas activas para liberar.');

    const facturas: readonly {
      readonly estado: string;
      readonly fecha_anulacion: string | null;
    }[] = (await dataSource.query(
      `
        SELECT
          estado,
          fecha_anulacion
        FROM factura
        WHERE public_id = 'factura-emitida'
      `,
    )) as readonly {
      readonly estado: string;
      readonly fecha_anulacion: string | null;
    }[];

    expect(facturas).toEqual([
      {
        estado: 'emitida',
        fecha_anulacion: null,
      },
    ]);
  });

  it('rechaza anular borradores, anuladas, eliminadas, ajenas o de clientes inactivos', async (): Promise<void> => {
    const commands = [
      {
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-borrador',
      },
      {
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-anulada',
      },
      {
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-borrador-eliminado',
      },
      {
        clientePublicId: 'cliente-1',
        facturaPublicId: 'factura-otro-cliente',
      },
      {
        clientePublicId: 'cliente-inactivo',
        facturaPublicId: 'factura-cliente-inactivo',
      },
    ] as const;

    for (const command of commands) {
      await expect(requireRepository().anularFactura(command)).rejects.toThrow(
        'La factura no pertenece al cliente o ya no está disponible para anular.',
      );
    }
  });

  it('recupera el snapshot documental de la factura y no los datos actuales del cliente', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await dataSource.query(`
      UPDATE factura
      SET
        nombre_apellidos = 'Facturación histórica',
        dni_cif = 'B12345678',
        telefono = '944123456',
        email = 'historica@example.com',
        direccion = 'Gran Vía 10',
        codigo_postal = '48001',
        poblacion = 'Bilbao',
        id_provincia = 48
      WHERE public_id = 'factura-emitida'
    `);

    await dataSource.query(`
      UPDATE cliente
      SET nombre_apellidos = 'Cliente cambiado posteriormente'
      WHERE public_id = 'cliente-1'
    `);

    await dataSource.query(`
      UPDATE linea_venta
      SET
        iva_bps = 2100,
        descuento_bps = 1000,
        importe_descuento_micros = 3000000
      WHERE public_id = 'linea-8'
    `);

    const result: ClienteFacturaDocumentoRecord | null =
      await requireRepository().findDocumentoByPublicId('cliente-1', 'factura-emitida');

    expect(result).toEqual({
      publicId: 'factura-emitida',
      serie: '',
      numero: 7,
      estado: 'emitida',
      importeCents: 12_345,
      fechaCreacion: '2026-08-19T10:00:00.000Z',
      fechaEmision: '2026-08-20 09:00:00',
      fechaAnulacion: null,
      cliente: {
        nombreApellidos: 'Facturación histórica',
        dniCif: 'B12345678',
        telefono: '944123456',
        email: 'historica@example.com',
        direccion: 'Gran Vía 10',
        codigoPostal: '48001',
        poblacion: 'Bilbao',
        provinciaId: 48,
      },
      ventas: [
        {
          publicId: 'venta-facturada',
          serie: '',
          numero: 7,
          fecha: '2026-09-05T10:00:00.000Z',
          totalCents: 3_000,
          lineas: [
            {
              localizador: 1007,
              marca: 'Marca',
              nombre: 'Facturada',
              pvpMicros: 30_000_000,
              ivaBps: 2100,
              importeMicros: 30_000_000,
              descuentoBps: 1000,
              importeDescuentoMicros: 3_000_000,
              unidades: 1,
              regalo: false,
            },
          ],
        },
      ],
    });
  });

  it('conserva las ventas históricas de una factura anulada en su documento', async (): Promise<void> => {
    const result: ClienteFacturaDocumentoRecord | null =
      await requireRepository().findDocumentoByPublicId('cliente-1', 'factura-anulada');

    expect(result?.estado).toBe('anulada');
    expect(result?.ventas.map((venta): string => venta.publicId)).toEqual(['venta-historica']);
  });

  it('no recupera documentos ajenos, eliminados o pertenecientes a clientes inactivos', async (): Promise<void> => {
    expect(
      await requireRepository().findDocumentoByPublicId('cliente-2', 'factura-emitida'),
    ).toBeNull();

    expect(
      await requireRepository().findDocumentoByPublicId('cliente-1', 'factura-borrador-eliminado'),
    ).toBeNull();

    expect(
      await requireRepository().findDocumentoByPublicId(
        'cliente-inactivo',
        'factura-cliente-inactivo',
      ),
    ).toBeNull();
  });

  it('recupera las relaciones activas e históricas de cualquier estado de factura', async (): Promise<void> => {
    const emitida: readonly ClienteFacturaVentaRecord[] =
      await requireRepository().findVentasByFacturaPublicId('cliente-1', 'factura-emitida');

    expect(emitida).toEqual([
      {
        id: 7,
        publicId: 'venta-facturada',
        serie: '',
        numero: 7,
        fecha: '2026-09-05T10:00:00.000Z',
        totalCents: 3_000,
        pagos: [],
      },
    ]);

    const borrador: readonly ClienteFacturaVentaRecord[] =
      await requireRepository().findVentasByFacturaPublicId('cliente-1', 'factura-borrador');

    expect(borrador).toEqual([
      {
        id: 8,
        publicId: 'venta-borrador',
        serie: '',
        numero: 8,
        fecha: '2026-09-04T09:00:00.000Z',
        totalCents: 2_000,
        pagos: [
          {
            tipoPagoPublicId: 'tipo-pago-tarjeta',
            nombre: 'Tarjeta',
            importeCents: 2_000,
          },
        ],
      },
    ]);

    const anulada: readonly ClienteFacturaVentaRecord[] =
      await requireRepository().findVentasByFacturaPublicId('cliente-1', 'factura-anulada');

    expect(anulada).toEqual([
      {
        id: 10,
        publicId: 'venta-historica',
        serie: '',
        numero: 10,
        fecha: '2026-09-12T10:00:00.000Z',
        totalCents: 1_500,
        pagos: [
          {
            tipoPagoPublicId: 'tipo-pago-efectivo',
            nombre: 'Efectivo',
            importeCents: 1_500,
          },
        ],
      },
    ]);
  });

  it('conserva la relación de una factura aunque su venta cambie después de cliente', async (): Promise<void> => {
    const dataSource: DataSource = await requireDataSource();

    await dataSource.query(`
      UPDATE venta
      SET id_cliente = 2
      WHERE public_id = 'venta-facturada'
    `);

    const result: readonly ClienteFacturaVentaRecord[] =
      await requireRepository().findVentasByFacturaPublicId('cliente-1', 'factura-emitida');

    expect(result.map((venta: ClienteFacturaVentaRecord): string => venta.publicId)).toEqual([
      'venta-facturada',
    ]);

    expect(
      await requireRepository().findVentasByFacturaPublicId('cliente-2', 'factura-emitida'),
    ).toEqual([]);
  });

  it('recupera únicamente las ventas disponibles para una factura nueva', async (): Promise<void> => {
    const result: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', null);

    expect(result).toEqual([
      {
        id: 10,
        publicId: 'venta-historica',
        serie: '',
        numero: 10,
        fecha: '2026-09-12T10:00:00.000Z',
        totalCents: 1_500,
        incluidaEnBorrador: false,
        pagos: [
          {
            tipoPagoPublicId: 'tipo-pago-efectivo',
            nombre: 'Efectivo',
            importeCents: 1_500,
          },
        ],
      },
      {
        id: 1,
        publicId: 'venta-disponible',
        serie: '',
        numero: 1,
        fecha: '2026-09-11T10:00:00.000Z',
        totalCents: 1_000,
        incluidaEnBorrador: false,
        pagos: [
          {
            tipoPagoPublicId: 'tipo-pago-efectivo',
            nombre: 'Efectivo',
            importeCents: 600,
          },
          {
            tipoPagoPublicId: 'tipo-pago-tarjeta',
            nombre: 'Tarjeta',
            importeCents: 400,
          },
        ],
      },
    ]);
  });

  it('incluye y marca las ventas pertenecientes al propio borrador', async (): Promise<void> => {
    const result: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', 'factura-borrador');

    expect(
      result.map((venta: ClienteFacturaVentaDisponibleRecord): string => venta.publicId),
    ).toEqual(['venta-historica', 'venta-disponible', 'venta-borrador']);

    expect(
      result.find(
        (venta: ClienteFacturaVentaDisponibleRecord): boolean =>
          venta.publicId === 'venta-borrador',
      )?.incluidaEnBorrador,
    ).toBe(true);

    expect(
      result
        .filter(
          (venta: ClienteFacturaVentaDisponibleRecord): boolean =>
            venta.publicId !== 'venta-borrador',
        )
        .every((venta: ClienteFacturaVentaDisponibleRecord): boolean => !venta.incluidaEnBorrador),
    ).toBe(true);
  });

  it('excluye devoluciones, operaciones mixtas y relaciones activas ajenas', async (): Promise<void> => {
    const result: readonly ClienteFacturaVentaDisponibleRecord[] =
      await requireRepository().findVentasDisponibles('cliente-1', 'factura-borrador');

    const publicIds: readonly string[] = result.map(
      (venta: ClienteFacturaVentaDisponibleRecord): string => venta.publicId,
    );

    expect(publicIds).not.toContain('venta-mixta');
    expect(publicIds).not.toContain('venta-devolucion');
    expect(publicIds).not.toContain('venta-negativa');
    expect(publicIds).not.toContain('venta-eliminada');
    expect(publicIds).not.toContain('venta-otro-cliente');
    expect(publicIds).not.toContain('venta-facturada');
    expect(publicIds).not.toContain('venta-cero');
  });

  it('no devuelve ventas para clientes inexistentes o inactivos', async (): Promise<void> => {
    expect(await requireRepository().findVentasDisponibles('cliente-inexistente', null)).toEqual(
      [],
    );

    expect(await requireRepository().findVentasDisponibles('cliente-inactivo', null)).toEqual([]);
  });
});

/**
 * Crea el esquema SQLite real de la aplicación.
 */
async function createSchema(dataSource: DataSource): Promise<void> {
  await dataSource.query('PRAGMA foreign_keys = ON');

  for (const schema of completeDatabaseSchema) {
    for (const statement of schema.statements) {
      await dataSource.query(statement);
    }
  }
}

/**
 * Inserta clientes y facturas con todos los estados
 * necesarios para probar la consulta.
 */
async function seedFacturas(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO cliente (
      id,
      public_id,
      nombre_apellidos,
      deleted_at
    )
    VALUES
      (
        1,
        'cliente-1',
        'Cliente principal',
        NULL
      ),
      (
        2,
        'cliente-2',
        'Segundo cliente',
        NULL
      ),
      (
        3,
        'cliente-inactivo',
        'Cliente inactivo',
        '2026-09-01T10:00:00.000Z'
      )
  `);

  await dataSource.query(`
    INSERT INTO factura (
      id,
      public_id,
      id_cliente,
      numero,
      estado,
      nombre_apellidos,
      importe_cents,
      fecha_emision,
      fecha_anulacion,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES
      (
        1,
        'factura-emitida',
        1,
        7,
        'emitida',
        'Cliente principal',
        12345,
        '2026-08-20 09:00:00',
        NULL,
        '2026-08-19T10:00:00.000Z',
        '2026-08-20T09:00:00.000Z',
        NULL
      ),
      (
        2,
        'factura-borrador',
        1,
        NULL,
        'borrador',
        'Cliente principal',
        5000,
        NULL,
        NULL,
        '2026-09-04T10:00:00.000Z',
        '2026-09-04T10:00:00.000Z',
        NULL
      ),
      (
        3,
        'factura-anulada',
        1,
        6,
        'anulada',
        'Cliente principal',
        8750,
        '2026-07-15T09:00:00.000Z',
        '2026-09-03T12:00:00.000Z',
        '2026-07-14T10:00:00.000Z',
        '2026-09-03T12:00:00.000Z',
        NULL
      ),
      (
        4,
        'factura-borrador-eliminado',
        1,
        NULL,
        'borrador',
        'Cliente principal',
        2000,
        NULL,
        NULL,
        '2026-09-05T10:00:00.000Z',
        '2026-09-05T11:00:00.000Z',
        '2026-09-05T11:00:00.000Z'
      ),
      (
        5,
        'factura-otro-cliente',
        2,
        8,
        'emitida',
        'Segundo cliente',
        3000,
        '2026-09-04T11:00:00.000Z',
        NULL,
        '2026-09-04T10:00:00.000Z',
        '2026-09-04T11:00:00.000Z',
        NULL
      ),
      (
        6,
        'factura-cliente-inactivo',
        3,
        9,
        'emitida',
        'Cliente inactivo',
        4000,
        '2026-08-01T11:00:00.000Z',
        NULL,
        '2026-08-01T10:00:00.000Z',
        '2026-08-01T11:00:00.000Z',
        NULL
      )
  `);
}

/**
 * Inserta ventas disponibles, bloqueadas, eliminadas y con
 * devolución para probar todas las reglas de elegibilidad.
 */
async function seedVentas(dataSource: DataSource): Promise<void> {
  await dataSource.query(`
    INSERT INTO terminal (
      id,
      public_id,
      nombre,
      codigo
    )
    VALUES (
      1,
      'terminal-1',
      'Terminal de prueba',
      'TEST-1'
    )
  `);

  await dataSource.query(`
    INSERT INTO empleado (
      id,
      public_id,
      nombre,
      password_hash,
      password_algorithm,
      color,
      admin,
      activo
    )
    VALUES (
      1,
      'empleado-1',
      'Empleado de prueba',
      'hash-prueba',
      'scrypt',
      'FFFFFF',
      1,
      1
    )
  `);

  await dataSource.query(`
    INSERT INTO tipo_pago (
      id,
      public_id,
      nombre,
      slug,
      afecta_caja,
      orden,
      fisico,
      activo
    )
    VALUES
      (
        1,
        'tipo-pago-efectivo',
        'Efectivo',
        'efectivo',
        1,
        1,
        1,
        1
      ),
      (
        2,
        'tipo-pago-tarjeta',
        'Tarjeta',
        'tarjeta',
        0,
        2,
        1,
        1
      )
  `);

  await dataSource.query(`
    INSERT INTO caja (
      id,
      public_id,
      id_terminal,
      id_empleado_apertura,
      apertura
    )
    VALUES (
      1,
      'caja-1',
      1,
      1,
      '2026-09-01T08:00:00.000Z'
    )
  `);

  await dataSource.query(`
    INSERT INTO venta (
      id,
      public_id,
      id_caja,
      id_empleado,
      id_cliente,
      id_venta_origen_devolucion,
      numero,
      total_cents,
      created_at,
      updated_at,
      deleted_at
    )
    VALUES
      (
        1,
        'venta-disponible',
        1,
        1,
        1,
        NULL,
        1,
        1000,
        '2026-09-11T10:00:00.000Z',
        '2026-09-11T10:00:00.000Z',
        NULL
      ),
      (
        2,
        'venta-mixta',
        1,
        1,
        1,
        NULL,
        2,
        500,
        '2026-09-10T10:00:00.000Z',
        '2026-09-10T10:00:00.000Z',
        NULL
      ),
      (
        3,
        'venta-devolucion',
        1,
        1,
        1,
        1,
        3,
        -1000,
        '2026-09-09T10:00:00.000Z',
        '2026-09-09T10:00:00.000Z',
        NULL
      ),
      (
        4,
        'venta-negativa',
        1,
        1,
        1,
        NULL,
        4,
        -500,
        '2026-09-08T10:00:00.000Z',
        '2026-09-08T10:00:00.000Z',
        NULL
      ),
      (
        5,
        'venta-eliminada',
        1,
        1,
        1,
        NULL,
        5,
        2500,
        '2026-09-07T10:00:00.000Z',
        '2026-09-07T10:00:00.000Z',
        '2026-09-07T11:00:00.000Z'
      ),
      (
        6,
        'venta-otro-cliente',
        1,
        1,
        2,
        NULL,
        6,
        4000,
        '2026-09-06T10:00:00.000Z',
        '2026-09-06T10:00:00.000Z',
        NULL
      ),
      (
        7,
        'venta-facturada',
        1,
        1,
        1,
        NULL,
        7,
        3000,
        '2026-09-05T10:00:00.000Z',
        '2026-09-05T10:00:00.000Z',
        NULL
      ),
      (
        8,
        'venta-borrador',
        1,
        1,
        1,
        NULL,
        8,
        2000,
        '2026-09-04T09:00:00.000Z',
        '2026-09-04T09:00:00.000Z',
        NULL
      ),
      (
        9,
        'venta-cero',
        1,
        1,
        1,
        NULL,
        9,
        0,
        '2026-09-03T10:00:00.000Z',
        '2026-09-03T10:00:00.000Z',
        NULL
      ),
      (
        10,
        'venta-historica',
        1,
        1,
        1,
        NULL,
        10,
        1500,
        '2026-09-12T10:00:00.000Z',
        '2026-09-12T10:00:00.000Z',
        NULL
      ),
      (
        11,
        'venta-cliente-inactivo',
        1,
        1,
        3,
        NULL,
        11,
        1000,
        '2026-09-02T10:00:00.000Z',
        '2026-09-02T10:00:00.000Z',
        NULL
      )
  `);

  await dataSource.query(`
    INSERT INTO linea_venta (
      id,
      public_id,
      id_venta,
      id_linea_venta_origen_devolucion,
      localizador,
      marca,
      nombre_articulo,
      pvp_micros,
      importe_micros,
      unidades
    )
    VALUES
      (1, 'linea-1', 1, NULL, 1001, 'Marca', 'Disponible', 10000000, 10000000, 1),
      (2, 'linea-2', 2, NULL, 1002, 'Marca', 'Parte positiva', 5000000, 10000000, 2),
      (3, 'linea-3', 2, 1, 1001, 'Marca', 'Parte devuelta', 5000000, -5000000, -1),
      (4, 'linea-4', 3, 1, 1001, 'Marca', 'Devolución', 10000000, -10000000, -1),
      (5, 'linea-5', 4, NULL, 1004, 'Marca', 'Negativa', 5000000, -5000000, -1),
      (6, 'linea-6', 5, NULL, 1005, 'Marca', 'Eliminada', 25000000, 25000000, 1),
      (7, 'linea-7', 6, NULL, 1006, 'Marca', 'Otro cliente', 40000000, 40000000, 1),
      (8, 'linea-8', 7, NULL, 1007, 'Marca', 'Facturada', 30000000, 30000000, 1),
      (9, 'linea-9', 8, NULL, 1008, 'Marca', 'Borrador', 20000000, 20000000, 1),
      (10, 'linea-10', 9, NULL, 1009, 'Marca', 'Cero', 0, 0, 0),
      (11, 'linea-11', 10, NULL, 1010, 'Marca', 'Histórica', 15000000, 15000000, 1),
      (12, 'linea-12', 11, NULL, 1011, 'Marca', 'Cliente inactivo', 10000000, 10000000, 1)
  `);

  await dataSource.query(`
    INSERT INTO venta_pago (
      id,
      public_id,
      id_venta,
      id_tipo_pago,
      orden,
      importe_cents
    )
    VALUES
      (1, 'pago-venta-1-efectivo', 1, 1, 0, 600),
      (2, 'pago-venta-1-tarjeta', 1, 2, 1, 400),
      (3, 'pago-venta-8', 8, 2, 0, 2000),
      (4, 'pago-venta-10', 10, 1, 0, 1500)
  `);

  await dataSource.query(`
    INSERT INTO factura_venta (
      id_factura,
      id_venta,
      activa
    )
    VALUES
      (1, 7, 1),
      (2, 8, 1),
      (3, 10, 0)
  `);
}

/**
 * Devuelve la conexión utilizada por la prueba.
 */
async function requireDataSource(): Promise<DataSource> {
  if (applicationDatabase === null) {
    throw new Error('La base de datos de facturas de Clientes no está inicializada.');
  }

  return applicationDatabase.connect();
}

/**
 * Cuenta las facturas persistidas actualmente.
 */
async function countFacturas(): Promise<number> {
  const dataSource: DataSource = await requireDataSource();

  const rows: readonly { readonly total: number }[] = (await dataSource.query(`
    SELECT COUNT(*) AS total
    FROM factura
  `)) as readonly { readonly total: number }[];

  return rows[0]?.total ?? 0;
}

/**
 * Devuelve el repository inicializado para la prueba.
 */
function requireRepository(): TypeOrmClienteFacturasRepository {
  if (repository === null) {
    throw new Error('El repository de facturas de Clientes no está inicializado.');
  }

  return repository;
}
