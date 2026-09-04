import type ActualizarClienteCommand from '@desktop-contracts/clientes/actualizar-cliente-command.interface';
import type {
  ClienteConsumoMensualConsulta,
  ClienteConsumoMensualResultado,
} from '@desktop-contracts/clientes/cliente-consumo-mensual.interface';
import type {
  ClienteEstadisticasGeneralesInterface,
  ClienteEstadisticasInterface,
} from '@desktop-contracts/clientes/cliente-estadisticas.interface';
import type { ClienteFacturaInterface } from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';
import type CrearClienteCommand from '@desktop-contracts/clientes/crear-cliente-command.interface';

export default interface ClientesApi {
  getAll(): Promise<readonly ClienteInterface[]>;

  create(command: CrearClienteCommand): Promise<ClienteInterface>;

  update(command: ActualizarClienteCommand): Promise<ClienteInterface>;

  deactivate(publicId: string): Promise<void>;

  /**
   * Obtiene las facturas visibles de un cliente.
   */
  getFacturas(publicId: string): Promise<readonly ClienteFacturaInterface[]>;

  getEstadisticas(publicId: string): Promise<ClienteEstadisticasInterface>;

  getEstadisticasGenerales(publicId: string): Promise<ClienteEstadisticasGeneralesInterface>;

  /**
   * Obtiene la serie temporal del consumo de un cliente.
   */
  getConsumoMensual(
    consulta: ClienteConsumoMensualConsulta,
  ): Promise<ClienteConsumoMensualResultado>;
}
