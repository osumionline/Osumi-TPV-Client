import { Service } from '@angular/core';
import type {
  CaducidadArticuloSearchInterface,
  CaducidadCreateCommand,
} from '@desktop-contracts/almacen/caducidad-create.interface';
import type { CaducidadReportConsulta } from '@desktop-contracts/almacen/caducidad-report.interface';
import type {
  CaducidadConsulta,
  CaducidadFilterOptionsInterface,
  CaducidadResultado,
} from '@desktop-contracts/almacen/caducidad.interface';
import type {
  InventarioCsvExportResult,
  InventarioReportConsulta,
} from '@desktop-contracts/almacen/inventario-report.interface';
import type { InventarioSaveCommand } from '@desktop-contracts/almacen/inventario-save.interface';
import type {
  InventarioConsulta,
  InventarioResultado,
} from '@desktop-contracts/almacen/inventario.interface';

/**
 * Expone al frontend los casos de uso del módulo Almacén.
 */
@Service()
export default class AlmacenService {
  /**
   * Recupera una página persistida de Inventario.
   */
  searchInventario(consulta: InventarioConsulta): Promise<InventarioResultado> {
    return window.osumiDesktop.almacen.searchInventario(consulta);
  }

  /**
   * Exporta el conjunto persistido filtrado a CSV.
   */
  exportInventarioCsv(consulta: InventarioReportConsulta): Promise<InventarioCsvExportResult> {
    return window.osumiDesktop.almacen.exportInventarioCsv(consulta);
  }

  /**
   * Abre la vista independiente de impresión de Inventario.
   */
  openInventarioPrint(consulta: InventarioReportConsulta): Promise<void> {
    return window.osumiDesktop.almacen.openInventarioPrint(consulta);
  }

  /**
   * Persiste una fila modificada de Inventario.
   */
  saveInventarioRow(command: InventarioSaveCommand): Promise<void> {
    return window.osumiDesktop.almacen.saveInventarioRow(command);
  }

  /**
   * Persiste atómicamente todas las filas modificadas.
   */
  saveInventarioRows(commands: readonly InventarioSaveCommand[]): Promise<void> {
    return window.osumiDesktop.almacen.saveInventarioRows(commands);
  }

  /**
   * Da de baja un artículo desde Inventario.
   */
  deactivateArticulo(idArticulo: number): Promise<void> {
    return window.osumiDesktop.almacen.deactivateArticulo(idArticulo);
  }

  /**
   * Recupera una página persistida de Caducidades.
   */
  searchCaducidades(consulta: CaducidadConsulta): Promise<CaducidadResultado> {
    return window.osumiDesktop.almacen.searchCaducidades(consulta);
  }

  /**
   * Recupera las opciones históricas disponibles
   * para sus filtros.
   */
  getCaducidadFilterOptions(): Promise<CaducidadFilterOptionsInterface> {
    return window.osumiDesktop.almacen.getCaducidadFilterOptions();
  }

  /**
   * Busca artículos activos para registrar una caducidad.
   */
  searchCaducidadArticulos(texto: string): Promise<readonly CaducidadArticuloSearchInterface[]> {
    return window.osumiDesktop.almacen.searchCaducidadArticulos(texto);
  }

  /**
   * Registra una nueva pérdida por caducidad.
   */
  createCaducidad(command: CaducidadCreateCommand): Promise<void> {
    return window.osumiDesktop.almacen.createCaducidad(command);
  }

  /**
   * Revierte una pérdida por caducidad.
   */
  deactivateCaducidad(idCaducidad: number): Promise<void> {
    return window.osumiDesktop.almacen.deactivateCaducidad(idCaducidad);
  }

  /**
   * Abre el informe agregado de Caducidades.
   */
  openCaducidadReport(consulta: CaducidadReportConsulta): Promise<void> {
    return window.osumiDesktop.almacen.openCaducidadReport(consulta);
  }
}
