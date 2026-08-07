import type AssetUrlBuilder from '@backend/contracts/asset-url-builder.interface';
import type ProveedorRepository from '@backend/contracts/proveedor.repository.interface';
import type ComercialRecord from '@backend/domain/proveedores/comercial-record.interface';
import type ProveedorRecord from '@backend/domain/proveedores/proveedor-record.interface';

import type {
  ComercialInterface,
  ProveedorInterface,
} from '@desktop-contracts/proveedores/proveedor.interface';

export default class ProveedoresService {
  constructor(
    private readonly proveedorRepository: ProveedorRepository,
    private readonly assetUrlBuilder: AssetUrlBuilder,
  ) {}

  async getAll(): Promise<readonly ProveedorInterface[]> {
    const proveedores: readonly ProveedorRecord[] = await this.proveedorRepository.findAll();

    return proveedores.map((proveedor: ProveedorRecord): ProveedorInterface => ({
      id: proveedor.id,
      publicId: proveedor.publicId,
      nombre: proveedor.nombre,
      foto: this.assetUrlBuilder.build(proveedor.fotoRelativePath),
      direccion: proveedor.direccion,
      telefono: proveedor.telefono,
      email: proveedor.email,
      web: proveedor.web,
      observaciones: proveedor.observaciones,
      marcas: [...proveedor.marcas],
      comerciales: proveedor.comerciales.map((comercial: ComercialRecord): ComercialInterface => ({
        id: comercial.id,
        publicId: comercial.publicId,
        idProveedor: comercial.idProveedor,
        nombre: comercial.nombre,
        telefono: comercial.telefono,
        email: comercial.email,
        observaciones: comercial.observaciones,
      })),
    }));
  }
}
