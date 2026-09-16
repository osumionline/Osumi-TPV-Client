import type ProveedorComercialWorkspace from '@model/proveedores/proveedor-comercial-workspace.interface';
import type ProveedorFormModel from '@model/proveedores/proveedor-form.model';
import type ProveedorWorkspaceSection from '@model/proveedores/proveedor-workspace-section.type';

export default interface ProveedorWorkspace {
  readonly proveedorId: number | null;
  readonly proveedorPublicId: string | null;
  readonly draft: ProveedorFormModel;
  readonly baseSnapshot: ProveedorFormModel;
  readonly logoStagingId: string | null;
  readonly activeSection: ProveedorWorkspaceSection;
  readonly comercialWorkspace: ProveedorComercialWorkspace | null;
}
