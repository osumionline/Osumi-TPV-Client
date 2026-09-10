import type { InventarioRowInterface } from '@desktop-contracts/almacen/inventario/inventario.interface';
import InventarioDraftManager from '@model/almacen/inventario/inventario-draft-manager';
import type {
  InventarioDraftEntry,
  InventarioDraftValues,
} from '@model/almacen/inventario/inventario-draft.interface';

describe('InventarioDraftManager', (): void => {
  it('crea un draft normalizando las categorías', (): void => {
    const values: InventarioDraftValues = InventarioDraftManager.createValues(
      createRow({
        idsCategorias: [7, 2],
      }),
    );

    expect(values.idsCategorias).toEqual([2, 7]);
    expect(values.stock).toBe(8);
    expect(values.codigoAdicional).toBe('');
  });

  it('refresca un draft limpio al reconciliar', (): void => {
    const initial: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.reconcile(
      new Map<number, InventarioDraftEntry>(),
      [createRow()],
      'filter-a',
    );

    const refreshed: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.reconcile(
      initial,
      [
        createRow({
          stock: 12,
        }),
      ],
      'filter-a',
    );

    expect(refreshed.get(25)?.snapshot.stock).toBe(12);
    expect(refreshed.get(25)?.draft.stock).toBe(12);
  });

  it('conserva un draft dirty al reconciliar otra carga', (): void => {
    const initial: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.reconcile(
      new Map<number, InventarioDraftEntry>(),
      [createRow()],
      'filter-a',
    );

    const dirty: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.update(
      initial,
      25,
      {
        stock: 11,
      },
    );

    const reconciled: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.reconcile(
      dirty,
      [
        createRow({
          stock: 99,
        }),
      ],
      'filter-b',
    );

    expect(reconciled.get(25)?.snapshot.stock).toBe(8);
    expect(reconciled.get(25)?.draft.stock).toBe(11);
    expect(reconciled.get(25)?.filterKeys).toEqual(['filter-a', 'filter-b']);
  });

  it('detecta modificaciones y permite restaurarlas', (): void => {
    const initial: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.reconcile(
      new Map<number, InventarioDraftEntry>(),
      [createRow()],
      'filter-a',
    );

    const dirty: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.update(
      initial,
      25,
      {
        stock: 9,
        codigoAdicional: ' EXTRA ',
      },
    );

    const entry: InventarioDraftEntry | undefined = dirty.get(25);

    expect(entry).toBeDefined();
    expect(InventarioDraftManager.getDirtyFields(entry as InventarioDraftEntry)).toEqual([
      'stock',
      'codigoBarras',
    ]);

    const reset: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.reset(
      dirty,
      25,
    );

    expect(InventarioDraftManager.getDirtyFields(reset.get(25) as InventarioDraftEntry)).toEqual(
      [],
    );
  });

  it('crea una clave de filtro independiente de la paginación', (): void => {
    const first: string = InventarioDraftManager.buildFilterKey({
      idProveedor: 2,
      idMarca: 3,
      idCategoria: 7,
      texto: '  prueba  ',
      conDescuento: true,
      pagina: 1,
      num: 20,
    });

    const second: string = InventarioDraftManager.buildFilterKey({
      idProveedor: 2,
      idMarca: 3,
      idCategoria: 7,
      texto: 'prueba',
      conDescuento: true,
      pagina: 8,
      num: 200,
    });

    expect(first).toBe(second);
  });

  it('normaliza el código adicional al crear el comando de guardado', (): void => {
    const drafts: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.reconcile(
      new Map<number, InventarioDraftEntry>(),
      [createRow()],
      'filter-a',
    );

    const dirty: ReadonlyMap<number, InventarioDraftEntry> = InventarioDraftManager.update(
      drafts,
      25,
      {
        codigoAdicional: '  EXTRA-25  ',
      },
    );

    expect(
      InventarioDraftManager.createSaveCommand(25, dirty.get(25) as InventarioDraftEntry),
    ).toMatchObject({
      idArticulo: 25,
      codigoAdicional: 'EXTRA-25',
    });
  });
});

/**
 * Crea una fila persistida válida para los tests.
 */
function createRow(overrides: Partial<InventarioRowInterface> = {}): InventarioRowInterface {
  return {
    id: 25,
    publicId: 'article-25',
    localizador: 261234,
    idProveedor: 4,
    proveedorNombre: 'Proveedor',
    idMarca: 3,
    marcaNombre: 'Marca',
    referencia: 'REF-25',
    idsCategorias: [2, 7],
    nombre: 'Artículo de prueba',
    stock: 8,
    precioAlbaranMicros: 590_000,
    pucMicros: 744_580,
    pvpCents: 100,
    margenMicroporcentaje: 255_420,
    ivaBps: 2100,
    reBps: 520,
    tieneCodigoAdicional: false,
    sinVentasUltimos12Meses: false,
    ...overrides,
  };
}
