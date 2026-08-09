import type ClienteRepository from '@backend/contracts/clientes/cliente.repository.interface';
import type ClienteRecord from '@backend/domain/clientes/cliente-record.interface';
import type ClienteInterface from '@desktop-contracts/clientes/cliente.interface';

const BASIS_POINTS_PER_PERCENT: number = 100;

export default class ClientesService {
  constructor(private readonly clienteRepository: ClienteRepository) {}

  async getAll(): Promise<readonly ClienteInterface[]> {
    const clientes: readonly ClienteRecord[] = await this.clienteRepository.findAll();

    return clientes.map((cliente: ClienteRecord): ClienteInterface => ({
      id: cliente.id,
      publicId: cliente.publicId,
      nombreApellidos: cliente.nombreApellidos,
      dniCif: cliente.dniCif,
      telefono: cliente.telefono,
      email: cliente.email,
      direccion: cliente.direccion,
      codigoPostal: cliente.codigoPostal,
      poblacion: cliente.poblacion,
      provincia: cliente.provincia,
      factIgual: cliente.factIgual,
      factNombreApellidos: cliente.factNombreApellidos,
      factDniCif: cliente.factDniCif,
      factTelefono: cliente.factTelefono,
      factEmail: cliente.factEmail,
      factDireccion: cliente.factDireccion,
      factCodigoPostal: cliente.factCodigoPostal,
      factPoblacion: cliente.factPoblacion,
      factProvincia: cliente.factProvincia,
      observaciones: cliente.observaciones,
      descuento: cliente.descuentoBps / BASIS_POINTS_PER_PERCENT,
      ultimaVenta: cliente.ultimaVenta,
    }));
  }
}
