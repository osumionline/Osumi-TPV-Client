import type CaducidadesRepository from '@backend/contracts/almacen/caducidades/caducidades.repository.interface';
import type ImprentaRepository from '@backend/contracts/almacen/imprenta/imprenta.repository.interface';
import type InventarioRepository from '@backend/contracts/almacen/inventario/inventario.repository.interface';

/**
 * Fachada transitoria que agrupa los repositories
 * de los tres subdominios de Almacén.
 *
 * Se eliminará cuando los servicios de aplicación
 * queden separados por subdominio.
 */
export default interface AlmacenRepository
  extends InventarioRepository, CaducidadesRepository, ImprentaRepository {}
