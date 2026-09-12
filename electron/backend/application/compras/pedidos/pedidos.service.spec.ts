import PedidosService from '@backend/application/compras/pedidos/pedidos.service';
import type PedidoRepositoryQuery from '@backend/contracts/compras/pedidos/pedido-query.interface';
import type PedidosRepository from '@backend/contracts/compras/pedidos/pedidos.repository.interface';
import type PedidoArticuloRecord from '@backend/domain/compras/pedidos/pedido-articulo-record.interface';
import type {
  PedidoCabeceraRecord,
  PedidoFormOptionsRecord,
  PedidoSaveRecord,
} from '@backend/domain/compras/pedidos/pedido-cabecera-record.interface';
import type PedidoLineaRecord from '@backend/domain/compras/pedidos/pedido-linea-record.interface';
import type {
  PedidoFilterOptionsRecord,
  PedidosGuardadosResultadoRecord,
  PedidosRecepcionadosResultadoRecord,
} from '@backend/domain/compras/pedidos/pedido-listado-record.interface';
import type PedidoArticuloInterface from '@desktop-contracts/compras/pedidos/pedido-articulo.interface';
import type { PedidoSaveCommand } from '@desktop-contracts/compras/pedidos/pedido-cabecera.interface';
import type PedidoLineaInterface from '@desktop-contracts/compras/pedidos/pedido-linea.interface';
import type {
  PedidoListadoConsulta,
  PedidosGuardadosResultado,
  PedidosRecepcionadosResultado,
} from '@desktop-contracts/compras/pedidos/pedido-listado.interface';
import { describe, expect, it } from 'vitest';

class FakePedidosRepository implements PedidosRepository {
  lastGuardadosQuery: PedidoRepositoryQuery | null = null;
  lastRecepcionadosQuery: PedidoRepositoryQuery | null = null;
  lastGetPedidoId: number | null = null;
  lastGetPedidoLineasId: number | null = null;
  lastSavedCommand: PedidoSaveRecord | null = null;
  lastDeletedPedidoId: number | null = null;

  pedidoResult: PedidoCabeceraRecord | null = {
    id: 9,
    publicId: 'order-9',
    idProveedor: 4,
    proveedorNombre: 'Proveedor',
    idTipoPago: null,
    formaPago: 'Domiciliación bancaria',
    tipo: 'factura',
    numero: 'ORD-9',
    fechaPedido: '2026-09-10',
    fechaPago: '2026-09-11',
    fechaRecepcionado: null,
    recargoEquivalencia: true,
    europeo: false,
    recepcionado: false,
    observaciones: 'Pedido de prueba',
    columnasVisibles: [1, 4],
  };

  pedidoLineasResult: readonly PedidoLineaRecord[] = [
    {
      id: 21,
      publicId: 'order-line-21',
      orden: 0,
      idArticulo: 8,
      localizador: 123,
      nombreArticulo: 'Artículo del pedido',
      referencia: 'REF-123',
      marcaNombre: 'Marca',
      codigoBarras: '8412345678901',
      tieneCodigoBarrasAdicional: true,
      unidades: 3,
      stockActual: 7,
      stockFinal: 10,
      palbMicros: 10_000_000,
      pucMicros: 12_705_000,
      pvpMicros: 19_950_000,
      margenMicroporcentaje: 36_315_789,
      ivaBps: 2100,
      recargoEquivalenciaBps: 520,
      descuentoBps: 0,
    },
  ];

  lastResolvePedidoArticuloInput: {
    readonly codigo: string;
    readonly codigoNumerico: number | null;
  } | null = null;

  lastSearchPedidoArticulosPattern: string | null = null;

  pedidoArticuloResult: PedidoArticuloRecord | null = null;
  pedidoArticulosSearchResult: readonly PedidoArticuloRecord[] = [];

  /**
   * Devuelve el artículo configurado y conserva los datos
   * recibidos para comprobar la resolución en los tests.
   */
  resolvePedidoArticulo(
    codigo: string,
    codigoNumerico: number | null,
  ): Promise<PedidoArticuloRecord | null> {
    this.lastResolvePedidoArticuloInput = {
      codigo,
      codigoNumerico,
    };

    return Promise.resolve(this.pedidoArticuloResult);
  }

  /**
   * Devuelve los artículos configurados y conserva
   * el patrón de búsqueda recibido.
   */
  searchPedidoArticulos(searchPattern: string): Promise<readonly PedidoArticuloRecord[]> {
    this.lastSearchPedidoArticulosPattern = searchPattern;

    return Promise.resolve(this.pedidoArticulosSearchResult);
  }

  /**
   * Conserva la consulta de pendientes recibida.
   */
  searchPedidosGuardados(query: PedidoRepositoryQuery): Promise<PedidosGuardadosResultadoRecord> {
    this.lastGuardadosQuery = query;

    return Promise.resolve({
      rows: [
        {
          id: 1,
          publicId: 'order-1',
          fechaPedido: '2026-09-10',
          idProveedor: 4,
          proveedorNombre: 'Proveedor',
          tipo: 'factura',
          numero: 'ORD-1',
          importeMicros: 28_670_000,
          observaciones: 'Nota',
        },
      ],
      totalRows: 1,
    });
  }

  /**
   * Conserva la consulta de recepcionados recibida.
   */
  searchPedidosRecepcionados(
    query: PedidoRepositoryQuery,
  ): Promise<PedidosRecepcionadosResultadoRecord> {
    this.lastRecepcionadosQuery = query;

    return Promise.resolve({
      rows: [
        {
          id: 2,
          publicId: 'order-2',
          fechaPedido: '2026-05-26',
          fechaRecepcionado: '2026-05-29',
          fechaPago: '2026-05-29',
          idProveedor: 5,
          proveedorNombre: 'Proveedor UE',
          tipo: 'factura',
          numero: '#000051640',
          importeMicros: 603_990_000,
          observaciones: null,
          europeo: true,
        },
      ],
      totalRows: 1,
    });
  }

  /**
   * Devuelve opciones representativas de proveedor.
   */
  getPedidoFilterOptions(): Promise<PedidoFilterOptionsRecord> {
    return Promise.resolve({
      proveedores: [
        {
          idProveedor: 4,
          nombre: 'Proveedor',
        },
      ],
    });
  }

  /**
   * Devuelve el pedido configurado para el test.
   */
  getPedido(idPedido: number): Promise<PedidoCabeceraRecord | null> {
    this.lastGetPedidoId = idPedido;

    return Promise.resolve(this.pedidoResult);
  }

  /**
   * Devuelve las líneas configuradas para el test.
   */
  getPedidoLineas(idPedido: number): Promise<readonly PedidoLineaRecord[]> {
    this.lastGetPedidoLineasId = idPedido;

    return Promise.resolve(this.pedidoLineasResult);
  }

  /**
   * Devuelve opciones representativas para editar la ficha.
   */
  getPedidoFormOptions(): Promise<PedidoFormOptionsRecord> {
    return Promise.resolve({
      proveedores: [
        {
          idProveedor: 4,
          nombre: 'Proveedor',
        },
      ],
      tiposPago: [
        {
          idTipoPago: 7,
          nombre: 'Tarjeta',
        },
      ],
    });
  }

  /**
   * Conserva la cabecera recibida y devuelve un identificador simulado.
   */
  savePedido(command: PedidoSaveRecord): Promise<number> {
    this.lastSavedCommand = command;

    return Promise.resolve(77);
  }

  /**
   * Conserva el identificador del pedido solicitado para eliminación.
   */
  deletePedido(idPedido: number): Promise<void> {
    this.lastDeletedPedidoId = idPedido;

    return Promise.resolve();
  }
}

/**
 * Construye una consulta representativa de los listados.
 */
function createConsulta(overrides: Partial<PedidoListadoConsulta> = {}): PedidoListadoConsulta {
  return {
    fechaDesde: null,
    fechaHasta: null,
    idProveedor: null,
    numero: '',
    importeDesdeMicros: null,
    importeHastaMicros: null,
    pagina: 1,
    num: 20,
    ...overrides,
  };
}

/**
 * Construye un comando válido de guardado de Pedido.
 */
function createSaveCommand(overrides: Partial<PedidoSaveCommand> = {}): PedidoSaveCommand {
  return {
    id: null,
    idProveedor: 4,
    idTipoPago: null,
    formaPago: 'Domiciliación bancaria',
    tipo: 'factura',
    numero: 'ORD-77',
    fechaPedido: '2026-09-10',
    fechaPago: null,
    recargoEquivalencia: true,
    europeo: false,
    observaciones: 'Pedido de prueba',
    columnasVisibles: [1, 4],
    ...overrides,
  };
}

/**
 * Construye un artículo canónico representativo
 * para los casos de uso de Pedido.
 */
function createPedidoArticuloRecord(
  overrides: Partial<PedidoArticuloRecord> = {},
): PedidoArticuloRecord {
  return {
    id: 8,
    publicId: 'article-8',
    localizador: 123,
    nombre: 'Artículo de prueba',
    referencia: 'REF-123',
    marcaNombre: 'Marca de prueba',
    stock: 7,
    palbMicros: 10_000_000,
    pucMicros: 12_705_000,
    pvpMicros: 19_950_000,
    margenMicroporcentaje: 36_315_789,
    ivaBps: 2100,
    recargoEquivalenciaBps: 520,
    tieneCodigoBarrasAdicional: true,
    observaciones: 'Observación para pedidos',
    mostrarObservacionesPedidos: true,
    ...overrides,
  };
}

describe('PedidosService', (): void => {
  it('normaliza filtros y paginación de pedidos pendientes', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const result: PedidosGuardadosResultado = await service.searchPedidosGuardados(
      createConsulta({
        fechaDesde: '2026-01-01',
        fechaHasta: '2026-12-31',
        idProveedor: 4,
        numero: '  ORD  ',
        importeDesdeMicros: 10_000_000,
        importeHastaMicros: 50_000_000,
        pagina: 2,
        num: 20,
      }),
    );

    expect(repository.lastGuardadosQuery).toEqual({
      fechaDesde: '2026-01-01',
      fechaHasta: '2026-12-31',
      idProveedor: 4,
      numero: 'ORD',
      importeDesdeMicros: 10_000_000,
      importeHastaMicros: 50_000_000,
      offset: 20,
      limit: 20,
    });
    expect(result.rows[0]?.numero).toBe('ORD-1');
  });

  it('delega independientemente el listado de recepcionados', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const result: PedidosRecepcionadosResultado =
      await service.searchPedidosRecepcionados(createConsulta());

    expect(repository.lastGuardadosQuery).toBeNull();
    expect(repository.lastRecepcionadosQuery).not.toBeNull();
    expect(result.rows[0]).toMatchObject({
      id: 2,
      europeo: true,
      fechaRecepcionado: '2026-05-29',
    });
  });

  it('rechaza rangos de fecha e importe invertidos', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.searchPedidosGuardados(
        createConsulta({
          fechaDesde: '2026-09-10',
          fechaHasta: '2026-09-01',
        }),
      ),
    ).rejects.toThrow('La fecha inicial no puede ser posterior');

    await expect(
      service.searchPedidosGuardados(
        createConsulta({
          importeDesdeMicros: 20_000_000,
          importeHastaMicros: 10_000_000,
        }),
      ),
    ).rejects.toThrow('El importe mínimo no puede ser superior');
  });

  it('rechaza fechas civiles imposibles y tamaños de página ajenos al catálogo', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.searchPedidosGuardados(
        createConsulta({
          fechaDesde: '2026-02-30',
        }),
      ),
    ).rejects.toThrow('La fecha inicial');

    await expect(
      service.searchPedidosGuardados(
        createConsulta({
          num: 10,
        }),
      ),
    ).rejects.toThrow('El tamaño de página');
  });

  it('expone las opciones de proveedor de los filtros', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    const result = await service.getPedidoFilterOptions();

    expect(result).toEqual({
      proveedores: [
        {
          idProveedor: 4,
          nombre: 'Proveedor',
        },
      ],
    });
  });

  it('recupera y mapea la cabecera de un pedido', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const result = await service.getPedido(9);

    expect(repository.lastGetPedidoId).toBe(9);
    expect(result).toEqual({
      id: 9,
      publicId: 'order-9',
      idProveedor: 4,
      proveedorNombre: 'Proveedor',
      idTipoPago: null,
      formaPago: 'Domiciliación bancaria',
      tipo: 'factura',
      numero: 'ORD-9',
      fechaPedido: '2026-09-10',
      fechaPago: '2026-09-11',
      fechaRecepcionado: null,
      recargoEquivalencia: true,
      europeo: false,
      recepcionado: false,
      observaciones: 'Pedido de prueba',
      columnasVisibles: [1, 4],
    });
  });

  it('devuelve null cuando el pedido no existe', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    repository.pedidoResult = null;

    const service = new PedidosService(repository);

    await expect(service.getPedido(9)).resolves.toBeNull();
    expect(repository.lastGetPedidoId).toBe(9);
  });

  it('rechaza identificadores de pedido inválidos', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(service.getPedido(0)).rejects.toThrow('El identificador del pedido no es válido.');
    await expect(service.deletePedido(-1)).rejects.toThrow(
      'El identificador del pedido no es válido.',
    );
  });

  it('recupera y mapea las líneas de un pedido', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const result: readonly PedidoLineaInterface[] = await service.getPedidoLineas(9);

    expect(repository.lastGetPedidoLineasId).toBe(9);
    expect(result).toEqual([
      {
        id: 21,
        publicId: 'order-line-21',
        orden: 0,
        idArticulo: 8,
        localizador: 123,
        nombreArticulo: 'Artículo del pedido',
        referencia: 'REF-123',
        marcaNombre: 'Marca',
        codigoBarras: '8412345678901',
        tieneCodigoBarrasAdicional: true,
        unidades: 3,
        stockActual: 7,
        stockFinal: 10,
        palbMicros: 10_000_000,
        pucMicros: 12_705_000,
        pvpMicros: 19_950_000,
        margenMicroporcentaje: 36_315_789,
        ivaBps: 2100,
        recargoEquivalenciaBps: 520,
        descuentoBps: 0,
      },
    ]);
  });

  it('rechaza un identificador inválido al recuperar líneas', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(service.getPedidoLineas(0)).rejects.toThrow(
      'El identificador del pedido no es válido.',
    );
  });

  it('expone las opciones disponibles para editar la ficha', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    const result = await service.getPedidoFormOptions();

    expect(result).toEqual({
      proveedores: [
        {
          idProveedor: 4,
          nombre: 'Proveedor',
        },
      ],
      tiposPago: [
        {
          idTipoPago: 7,
          nombre: 'Tarjeta',
        },
      ],
    });
  });

  it('normaliza la cabecera antes de guardarla', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    const idPedido: number = await service.savePedido(
      createSaveCommand({
        formaPago: '  Domiciliación bancaria  ',
        numero: '  ORD-100  ',
        observaciones: '  Observación  ',
        columnasVisibles: [1, 4, 1],
      }),
    );

    expect(idPedido).toBe(77);
    expect(repository.lastSavedCommand).toEqual({
      id: null,
      idProveedor: 4,
      idTipoPago: null,
      formaPago: 'Domiciliación bancaria',
      tipo: 'factura',
      numero: 'ORD-100',
      fechaPedido: '2026-09-10',
      fechaPago: null,
      recargoEquivalencia: true,
      europeo: false,
      observaciones: 'Observación',
      columnasVisibles: [1, 4],
    });
  });

  it('rechaza un guardado sin proveedor válido', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.savePedido(
        createSaveCommand({
          idProveedor: 0,
        }),
      ),
    ).rejects.toThrow('Debes seleccionar un proveedor.');
  });

  it('rechaza fechas imposibles en la cabecera', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.savePedido(
        createSaveCommand({
          fechaPedido: '2026-02-30',
        }),
      ),
    ).rejects.toThrow('Una de las fechas del pedido no es válida.');
  });

  it('rechaza tipos documentales desconocidos', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());
    const command: PedidoSaveCommand = {
      ...createSaveCommand(),
      tipo: 'desconocido',
    } as unknown as PedidoSaveCommand;

    await expect(service.savePedido(command)).rejects.toThrow(
      'El tipo documental del pedido no es válido.',
    );
  });

  it('rechaza identificadores de columnas que no pertenecen al catálogo opcional', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(
      service.savePedido(
        createSaveCommand({
          columnasVisibles: [1, 999],
        }),
      ),
    ).rejects.toThrow('La configuración de columnas del pedido no es válida.');
  });

  it('delega la eliminación de un pedido válido', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    await service.deletePedido(9);

    expect(repository.lastDeletedPedidoId).toBe(9);
  });

  it('normaliza y resuelve un código numérico de artículo', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    repository.pedidoArticuloResult = createPedidoArticuloRecord();

    const service = new PedidosService(repository);

    const result: PedidoArticuloInterface | null = await service.resolvePedidoArticulo('  55  ');

    expect(repository.lastResolvePedidoArticuloInput).toEqual({
      codigo: '55',
      codigoNumerico: 55,
    });

    expect(result).toEqual({
      id: 8,
      publicId: 'article-8',
      localizador: 123,
      nombre: 'Artículo de prueba',
      referencia: 'REF-123',
      marcaNombre: 'Marca de prueba',
      stock: 7,
      palbMicros: 10_000_000,
      pucMicros: 12_705_000,
      pvpMicros: 19_950_000,
      margenMicroporcentaje: 36_315_789,
      ivaBps: 2100,
      recargoEquivalenciaBps: 520,
      tieneCodigoBarrasAdicional: true,
      observaciones: 'Observación para pedidos',
      mostrarObservacionesPedidos: true,
    });
  });

  it('resuelve un código alfanumérico sin convertirlo a número', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    repository.pedidoArticuloResult = createPedidoArticuloRecord();

    const service = new PedidosService(repository);

    await service.resolvePedidoArticulo(' EXTRA-A ');

    expect(repository.lastResolvePedidoArticuloInput).toEqual({
      codigo: 'EXTRA-A',
      codigoNumerico: null,
    });
  });

  it('no consulta el repository cuando el código está vacío', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    await expect(service.resolvePedidoArticulo('   ')).resolves.toBeNull();

    expect(repository.lastResolvePedidoArticuloInput).toBeNull();
  });

  it('trata como barcode un número que no cabe en un entero seguro', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    await service.resolvePedidoArticulo('999999999999999999999999');

    expect(repository.lastResolvePedidoArticuloInput).toEqual({
      codigo: '999999999999999999999999',
      codigoNumerico: null,
    });
  });

  it('rechaza códigos de artículo inválidos o demasiado largos', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(service.resolvePedidoArticulo(123 as unknown as string)).rejects.toThrow(
      'El código del artículo no es válido.',
    );

    await expect(service.resolvePedidoArticulo('A'.repeat(101))).rejects.toThrow(
      'El código del artículo es demasiado largo.',
    );
  });

  it('normaliza acentos y palabras para buscar artículos por slug', async (): Promise<void> => {
    const repository = new FakePedidosRepository();

    repository.pedidoArticulosSearchResult = [
      createPedidoArticuloRecord(),
      createPedidoArticuloRecord({
        id: 9,
        publicId: 'article-9',
        localizador: 124,
        nombre: 'Segundo artículo',
      }),
    ];

    const service = new PedidosService(repository);

    const result: readonly PedidoArticuloInterface[] =
      await service.searchPedidoArticulos('  Artículo   Ázul  ');

    expect(repository.lastSearchPedidoArticulosPattern).toBe('%articulo%azul%');

    expect(result.map((articulo: PedidoArticuloInterface): number => articulo.id)).toEqual([8, 9]);
  });

  it('no busca cuando el texto libre está vacío o no contiene términos', async (): Promise<void> => {
    const repository = new FakePedidosRepository();
    const service = new PedidosService(repository);

    await expect(service.searchPedidoArticulos('   ')).resolves.toEqual([]);

    await expect(service.searchPedidoArticulos(' --- ### ')).resolves.toEqual([]);

    expect(repository.lastSearchPedidoArticulosPattern).toBeNull();
  });

  it('rechaza textos de búsqueda inválidos o demasiado largos', async (): Promise<void> => {
    const service = new PedidosService(new FakePedidosRepository());

    await expect(service.searchPedidoArticulos(null as unknown as string)).rejects.toThrow(
      'El texto de búsqueda de artículos no es válido.',
    );

    await expect(service.searchPedidoArticulos('A'.repeat(201))).rejects.toThrow(
      'El texto de búsqueda de artículos es demasiado largo.',
    );
  });
});
