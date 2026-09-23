import InformePeriodoResolver from '@backend/application/caja/informes/informe-periodo.resolver';
import type InformeVentasProvider from '@backend/contracts/caja/informes/informe-ventas-provider.interface';
import type InformeVentasRepository from '@backend/contracts/caja/informes/informe-ventas.repository.interface';
import type { InformePeriodosResueltos } from '@backend/domain/caja/informes/informe-periodo-resuelto.interface';
import type {
  InformeVentasCategoriaRecord,
  InformeVentasLineaRecord,
  InformeVentasRepositoryResult,
} from '@backend/domain/caja/informes/informe-ventas-record.interface';
import type {
  InformeVentasArticulo,
  InformeVentasCategoria,
  InformeVentasConsulta,
  InformeVentasMarca,
  InformeVentasResultado,
} from '@desktop-contracts/caja/informes/informe-ventas.interface';

interface InformeVentasAggregate {
  readonly importeMicros: number;
  readonly unidades: number;
  readonly ventasPvpMicros: number;
  readonly beneficioMicros: number;
  readonly margenBps: number;
}

interface InformeVentasBuildContext {
  readonly categoriasById: ReadonlyMap<number, InformeVentasCategoriaRecord>;

  readonly childrenByParent: ReadonlyMap<number, readonly InformeVentasCategoriaRecord[]>;

  readonly articleIdsByCategory: ReadonlyMap<number, ReadonlySet<number>>;

  readonly linesByArticle: ReadonlyMap<number, readonly InformeVentasLineaRecord[]>;

  readonly linesById: ReadonlyMap<number, InformeVentasLineaRecord>;
}

interface BuiltCategoria {
  readonly categoria: InformeVentasCategoria;
  readonly lineIds: ReadonlySet<number>;
}

/**
 * Construye el Informe de Ventas utilizando
 * la clasificación actual de los artículos.
 */
export default class InformeVentasService implements InformeVentasProvider {
  constructor(
    private readonly repository: InformeVentasRepository,

    private readonly periodoResolver: InformePeriodoResolver,
  ) {}

  /**
   * Genera el árbol de ventas de la categoría
   * y periodo solicitados.
   */
  async getInforme(consulta: InformeVentasConsulta): Promise<InformeVentasResultado> {
    const periodos: InformePeriodosResueltos = this.periodoResolver.resolve(consulta);

    const record: InformeVentasRepositoryResult = await this.repository.findByPeriod(
      periodos.actual.desde,
      periodos.actual.hastaExclusive,
    );

    const context: InformeVentasBuildContext = this.createContext(record);

    if (!context.categoriasById.has(consulta.idCategoria)) {
      throw new RangeError('La categoría seleccionada no existe.');
    }

    const built: BuiltCategoria | null = this.buildCategoria(
      consulta.idCategoria,
      context,
      new Set<number>(),
    );

    return {
      categoria: built?.categoria ?? null,
    };
  }

  /**
   * Indexa los registros del repository para
   * construir el árbol sin repetir consultas.
   */
  private createContext(record: InformeVentasRepositoryResult): InformeVentasBuildContext {
    const categoriasById: Map<number, InformeVentasCategoriaRecord> = new Map<
      number,
      InformeVentasCategoriaRecord
    >();

    const childrenByParent: Map<number, InformeVentasCategoriaRecord[]> = new Map<
      number,
      InformeVentasCategoriaRecord[]
    >();

    for (const categoria of record.categorias) {
      categoriasById.set(categoria.idCategoria, categoria);

      if (categoria.idPadre === null) {
        continue;
      }

      const children: InformeVentasCategoriaRecord[] =
        childrenByParent.get(categoria.idPadre) ?? [];

      children.push(categoria);

      childrenByParent.set(categoria.idPadre, children);
    }

    for (const children of childrenByParent.values()) {
      children.sort((a: InformeVentasCategoriaRecord, b: InformeVentasCategoriaRecord): number =>
        this.compareCategorias(a, b),
      );
    }

    const articleIdsByCategory: Map<number, Set<number>> = new Map<number, Set<number>>();

    for (const relation of record.articuloCategorias) {
      const articleIds: Set<number> =
        articleIdsByCategory.get(relation.idCategoria) ?? new Set<number>();

      articleIds.add(relation.idArticulo);

      articleIdsByCategory.set(relation.idCategoria, articleIds);
    }

    const linesByArticle: Map<number, InformeVentasLineaRecord[]> = new Map<
      number,
      InformeVentasLineaRecord[]
    >();

    const linesById: Map<number, InformeVentasLineaRecord> = new Map<
      number,
      InformeVentasLineaRecord
    >();

    for (const linea of record.lineas) {
      linesById.set(linea.idLinea, linea);

      const articleLines: InformeVentasLineaRecord[] = linesByArticle.get(linea.idArticulo) ?? [];

      articleLines.push(linea);

      linesByArticle.set(linea.idArticulo, articleLines);
    }

    return {
      categoriasById,
      childrenByParent,
      articleIdsByCategory,
      linesByArticle,
      linesById,
    };
  }

  /**
   * Construye recursivamente una categoría.
   *
   * Devuelve null únicamente cuando la rama
   * completa no contiene ninguna línea de venta.
   */
  private buildCategoria(
    idCategoria: number,
    context: InformeVentasBuildContext,
    ancestors: ReadonlySet<number>,
  ): BuiltCategoria | null {
    if (ancestors.has(idCategoria)) {
      throw new Error('El árbol de categorías contiene un ciclo.');
    }

    const categoriaRecord: InformeVentasCategoriaRecord | undefined =
      context.categoriasById.get(idCategoria);

    if (categoriaRecord === undefined) {
      return null;
    }

    const nextAncestors: Set<number> = new Set<number>(ancestors);

    nextAncestors.add(idCategoria);

    const directLines: readonly InformeVentasLineaRecord[] = this.getDirectLines(
      idCategoria,
      context,
    );

    const lineIds: Set<number> = new Set<number>(
      directLines.map((linea: InformeVentasLineaRecord): number => linea.idLinea),
    );

    const subcategorias: InformeVentasCategoria[] = [];

    const children: readonly InformeVentasCategoriaRecord[] =
      context.childrenByParent.get(idCategoria) ?? [];

    for (const child of children) {
      const builtChild: BuiltCategoria | null = this.buildCategoria(
        child.idCategoria,
        context,
        nextAncestors,
      );

      if (builtChild === null) {
        continue;
      }

      subcategorias.push(builtChild.categoria);

      for (const idLinea of builtChild.lineIds) {
        lineIds.add(idLinea);
      }
    }

    if (lineIds.size === 0) {
      return null;
    }

    const allLines: readonly InformeVentasLineaRecord[] = this.getLinesByIds(lineIds, context);

    const aggregate: InformeVentasAggregate = this.aggregateLines(allLines);

    return {
      categoria: {
        idCategoria: categoriaRecord.idCategoria,

        categoriaPublicId: categoriaRecord.categoriaPublicId,

        nombre: categoriaRecord.nombre,

        importeMicros: aggregate.importeMicros,

        unidades: aggregate.unidades,

        ventasPvpMicros: aggregate.ventasPvpMicros,

        beneficioMicros: aggregate.beneficioMicros,

        margenBps: aggregate.margenBps,

        articulos: this.mapArticulos(directLines),

        marcas: this.mapMarcas(directLines),

        subcategorias,
      },

      lineIds,
    };
  }

  /**
   * Recupera, sin duplicados, las líneas de
   * los artículos asignados directamente
   * a una categoría.
   */
  private getDirectLines(
    idCategoria: number,
    context: InformeVentasBuildContext,
  ): readonly InformeVentasLineaRecord[] {
    const articleIds: ReadonlySet<number> =
      context.articleIdsByCategory.get(idCategoria) ?? new Set<number>();

    const lines: Map<number, InformeVentasLineaRecord> = new Map<
      number,
      InformeVentasLineaRecord
    >();

    for (const idArticulo of articleIds) {
      for (const linea of context.linesByArticle.get(idArticulo) ?? []) {
        lines.set(linea.idLinea, linea);
      }
    }

    return Array.from(lines.values());
  }

  /**
   * Resuelve las líneas correspondientes
   * a un conjunto deduplicado de IDs.
   */
  private getLinesByIds(
    lineIds: ReadonlySet<number>,
    context: InformeVentasBuildContext,
  ): readonly InformeVentasLineaRecord[] {
    const lines: InformeVentasLineaRecord[] = [];

    for (const idLinea of lineIds) {
      const linea: InformeVentasLineaRecord | undefined = context.linesById.get(idLinea);

      if (linea !== undefined) {
        lines.push(linea);
      }
    }

    return lines;
  }

  /**
   * Agrupa las líneas directas en filas de
   * artículo preservando sus snapshots históricos.
   */
  private mapArticulos(
    lines: readonly InformeVentasLineaRecord[],
  ): readonly InformeVentasArticulo[] {
    const groups: Map<string, InformeVentasLineaRecord[]> = new Map<
      string,
      InformeVentasLineaRecord[]
    >();

    for (const linea of lines) {
      const key: string = JSON.stringify([
        linea.idArticulo,
        linea.idMarcaSnapshot,
        linea.marca,
        linea.nombreArticulo,
      ]);

      const group: InformeVentasLineaRecord[] = groups.get(key) ?? [];

      group.push(linea);
      groups.set(key, group);
    }

    const articulos: InformeVentasArticulo[] = [];

    for (const group of groups.values()) {
      const first: InformeVentasLineaRecord | undefined = group[0];

      if (first === undefined) {
        continue;
      }

      const aggregate: InformeVentasAggregate = this.aggregateLines(group);

      articulos.push({
        idArticulo: first.idArticulo,

        articuloPublicId: first.articuloPublicId,

        idMarcaSnapshot: first.idMarcaSnapshot,

        marca: first.marca,

        nombre: first.nombreArticulo,

        importeMicros: aggregate.importeMicros,

        unidades: aggregate.unidades,

        ventasPvpMicros: aggregate.ventasPvpMicros,

        beneficioMicros: aggregate.beneficioMicros,

        margenBps: aggregate.margenBps,
      });
    }

    articulos.sort(
      (a: InformeVentasArticulo, b: InformeVentasArticulo): number =>
        b.importeMicros - a.importeMicros ||
        a.marca.localeCompare(b.marca, 'es', {
          sensitivity: 'base',
        }) ||
        a.nombre.localeCompare(b.nombre, 'es', {
          sensitivity: 'base',
        }),
    );

    return articulos;
  }

  /**
   * Agrupa las líneas directas por el snapshot
   * histórico de marca.
   */
  private mapMarcas(lines: readonly InformeVentasLineaRecord[]): readonly InformeVentasMarca[] {
    const groups: Map<string, InformeVentasLineaRecord[]> = new Map<
      string,
      InformeVentasLineaRecord[]
    >();

    for (const linea of lines) {
      const key: string = JSON.stringify([linea.idMarcaSnapshot, linea.marca]);

      const group: InformeVentasLineaRecord[] = groups.get(key) ?? [];

      group.push(linea);
      groups.set(key, group);
    }

    const marcas: InformeVentasMarca[] = [];

    for (const group of groups.values()) {
      const first: InformeVentasLineaRecord | undefined = group[0];

      if (first === undefined) {
        continue;
      }

      const aggregate: InformeVentasAggregate = this.aggregateLines(group);

      marcas.push({
        idMarcaSnapshot: first.idMarcaSnapshot,

        nombre: first.marca,

        importeMicros: aggregate.importeMicros,

        unidades: aggregate.unidades,

        ventasPvpMicros: aggregate.ventasPvpMicros,

        beneficioMicros: aggregate.beneficioMicros,

        margenBps: aggregate.margenBps,
      });
    }

    marcas.sort(
      (a: InformeVentasMarca, b: InformeVentasMarca): number =>
        b.importeMicros - a.importeMicros ||
        a.nombre.localeCompare(b.nombre, 'es', {
          sensitivity: 'base',
        }),
    );

    return marcas;
  }

  /**
   * Calcula las magnitudes económicas de un
   * conjunto de líneas, deduplicándolas por ID.
   */
  private aggregateLines(lines: readonly InformeVentasLineaRecord[]): InformeVentasAggregate {
    const uniqueLines: Map<number, InformeVentasLineaRecord> = new Map<
      number,
      InformeVentasLineaRecord
    >();

    for (const linea of lines) {
      uniqueLines.set(linea.idLinea, linea);
    }

    let importeMicros: number = 0;
    let unidades: number = 0;
    let ventasPvpMicros: number = 0;
    let beneficioMicros: number = 0;

    for (const linea of uniqueLines.values()) {
      importeMicros += linea.importeMicros;

      unidades += linea.unidades;

      const lineaVentasPvpMicros: number = linea.pvpMicros * linea.unidades;

      const lineaBeneficioMicros: number = (linea.pvpMicros - linea.pucMicros) * linea.unidades;

      ventasPvpMicros += lineaVentasPvpMicros;

      beneficioMicros += lineaBeneficioMicros;
    }

    return {
      importeMicros,
      unidades,
      ventasPvpMicros,
      beneficioMicros,

      margenBps: this.calculateMarginBps(beneficioMicros, ventasPvpMicros),
    };
  }

  /**
   * Calcula un margen ponderado expresado
   * en puntos básicos.
   */
  private calculateMarginBps(beneficioMicros: number, ventasPvpMicros: number): number {
    if (ventasPvpMicros === 0) {
      return 0;
    }

    return Math.round((beneficioMicros / ventasPvpMicros) * 10_000);
  }

  /**
   * Compara categorías utilizando el orden
   * actual del catálogo.
   */
  private compareCategorias(
    a: InformeVentasCategoriaRecord,
    b: InformeVentasCategoriaRecord,
  ): number {
    return (
      a.orden - b.orden ||
      a.nombre.localeCompare(b.nombre, 'es', {
        sensitivity: 'base',
      }) ||
      a.idCategoria - b.idCategoria
    );
  }
}
