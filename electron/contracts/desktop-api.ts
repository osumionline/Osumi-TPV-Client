import type ApplicationApi from '@desktop-contracts/application/application-api.interface';
import type CategoriasApi from '@desktop-contracts/categorias/categorias-api.interface';
import type ClientesApi from '@desktop-contracts/clientes/clientes-api.interface';
import type ConfigurationApi from '@desktop-contracts/configuration/configuration-api.interface';
import type EmpleadosApi from '@desktop-contracts/empleados/empleados-api.interface';
import type LegacyImportApi from '@desktop-contracts/legacy-import/legacy-import-api.interface';
import type MarcasApi from '@desktop-contracts/marcas/marcas-api.interface';
import type ProveedoresApi from '@desktop-contracts/proveedores/proveedores-api.interface';
import type SystemApi from '@desktop-contracts/system/system-api.interface';
import type VentasApi from '@desktop-contracts/ventas/ventas-api.interface';

export default interface OsumiDesktopApi {
  readonly isElectron: true;
  readonly application: ApplicationApi;
  readonly system: SystemApi;
  readonly legacyImport: LegacyImportApi;
  readonly configuration: ConfigurationApi;
  readonly marcas: MarcasApi;
  readonly proveedores: ProveedoresApi;
  readonly empleados: EmpleadosApi;
  readonly categorias: CategoriasApi;
  readonly clientes: ClientesApi;
  readonly ventas: VentasApi;
}
