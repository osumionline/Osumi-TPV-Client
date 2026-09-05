import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type ActualizarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/actualizar-cliente-factura-borrador-command.interface';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type {
  ClienteFacturaVentaDisponibleInterface,
  ClienteFacturaVentaInterface,
  ClienteFacturaVentasConsulta,
  ClienteFacturaVentasDisponiblesConsulta,
} from '@desktop-contracts/clientes/cliente-factura-venta.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';
import type CrearClienteFacturaBorradorCommand from '@desktop-contracts/clientes/crear-cliente-factura-borrador-command.interface';
import type EliminarClienteFacturaBorradorCommand from '@desktop-contracts/clientes/eliminar-cliente-factura-borrador-command.interface';

export default interface ClientesApi {
  getAll(): Promise<readonly ClienteInterface[]>;

  create(command: CrearClienteCommand): Promise<ClienteInterface>;

  update(command: ActualizarClienteCommand): Promise<ClienteInterface>;

  deactivate(publicId: string): Promise<void>;

  /**
   * Obtiene las facturas visibles de un cliente.
   */
  getFacturas(publicId: string): Promise<readonly ClienteFacturaInterface[]>;

  /**
   * Crea un nuevo borrador de factura.
   */
  createFacturaBorrador(
    command: CrearClienteFacturaBorradorCommand,
  ): Promise<ClienteFacturaInterface>;

  /**
   * Actualiza las ventas de un borrador de factura.
   */
  updateFacturaBorrador(
    command: ActualizarClienteFacturaBorradorCommand,
  ): Promise<ClienteFacturaInterface>;

  /**
   * Elimina un borrador y libera sus ventas.
   */
  deleteFacturaBorrador(command: EliminarClienteFacturaBorradorCommand): Promise<void>;

  /**
   * Obtiene las ventas relacionadas históricamente
   * con una factura persistida.
   */
  getFacturaVentas(
    consulta: ClienteFacturaVentasConsulta,
  ): Promise<readonly ClienteFacturaVentaInterface[]>;

  /**
   * Obtiene las ventas disponibles para crear
   * o editar una factura de cliente.
   */
  getFacturaVentasDisponibles(
    consulta: ClienteFacturaVentasDisponiblesConsulta,
  ): Promise<readonly ClienteFacturaVentaDisponibleInterface[]>;

  getEstadisticas(publicId: string): Promise<ClienteEstadisticasInterface>;

  getEstadisticasGenerales(publicId: string): Promise<ClienteEstadisticasGeneralesInterface>;

  /**
   * Obtiene la serie temporal del consumo de un cliente.
   */
  getConsumoMensual(
    consulta: ClienteConsumoMensualConsulta,
  ): Promise<ClienteConsumoMensualResultado>;
}
