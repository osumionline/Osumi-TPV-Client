import type ImprentaPrintProvider from '@backend/contracts/almacen/imprenta/imprenta-print-provider.interface';
import type ImprentaRepository from '@backend/contracts/almacen/imprenta/imprenta.repository.interface';
import type ImprentaArticuloSearchRecord from '@backend/domain/almacen/imprenta/imprenta-articulo-search-record.interface';
import type ImprentaPrintArticuloRecord from '@backend/domain/almacen/imprenta/imprenta-print-articulo-record.interface';
import type {
  ImprentaArticuloSearchConsulta,
  ImprentaArticuloSearchInterface,
} from '@desktop-contracts/almacen/imprenta/imprenta-articulo.interface';
import type { ImprentaPrintArticuloInterface } from '@desktop-contracts/almacen/imprenta/imprenta-print.interface';

/**
 * Expone los casos de uso propios de Imprenta.
 */
export default class ImprentaService implements ImprentaPrintProvider {
  /**
   * Crea el servicio de Imprenta.
   */
  constructor(private readonly imprentaRepository: ImprentaRepository) {}

  /**
   * Valida y ejecuta la búsqueda de artículos
   * disponibles para el diseñador de Imprenta.
   */
  async searchImprentaArticulos(
    consulta: ImprentaArticuloSearchConsulta,
  ): Promise<readonly ImprentaArticuloSearchInterface[]> {
    if (typeof consulta !== 'object' || consulta === null) {
      throw new Error('La consulta de artículos de Imprenta no es válida.');
    }
    if (typeof consulta.texto !== 'string') {
      throw new Error('El texto de búsqueda de Imprenta no es válido.');
    }
    if (!Array.isArray(consulta.idsArticulosExcluidos)) {
      throw new Error('Los artículos excluidos de Imprenta no son válidos.');
    }

    const excludedIds: Set<number> = new Set<number>();

    for (const idArticulo of consulta.idsArticulosExcluidos as readonly unknown[]) {
      if (typeof idArticulo !== 'number' || !Number.isSafeInteger(idArticulo) || idArticulo <= 0) {
        throw new Error('Uno de los artículos excluidos de Imprenta no es válido.');
      }

      excludedIds.add(idArticulo);
    }

    const texto: string = consulta.texto.trim();

    if (texto.length === 0) {
      return [];
    }
    if (texto.length > 200) {
      throw new Error('El texto de búsqueda de Imprenta es demasiado largo.');
    }

    const idsArticulosExcluidos: readonly number[] = [...excludedIds].sort(
      (left: number, right: number): number => left - right,
    );

    const rows: readonly ImprentaArticuloSearchRecord[] =
      await this.imprentaRepository.searchImprentaArticulos(texto, idsArticulosExcluidos);

    return rows.map((row: ImprentaArticuloSearchRecord): ImprentaArticuloSearchInterface => ({
      id: row.id,
      localizador: row.localizador,
      marcaNombre: row.marcaNombre,
      nombre: row.nombre,
      pvpCents: row.pvpCents,
    }));
  }

  /**
   * Recupera los valores persistidos actuales utilizados
   * por el documento definitivo de Imprenta.
   */
  async getImprentaPrintArticulos(
    idsArticulos: readonly number[],
  ): Promise<readonly ImprentaPrintArticuloInterface[]> {
    const rows: readonly ImprentaPrintArticuloRecord[] =
      await this.imprentaRepository.getImprentaPrintArticulos(idsArticulos);

    return rows.map((row: ImprentaPrintArticuloRecord): ImprentaPrintArticuloInterface => ({
      idArticulo: row.idArticulo,
      localizador: row.localizador,
      marcaNombre: row.marcaNombre,
      nombre: row.nombre,
      pvpCents: row.pvpCents,
    }));
  }
}
