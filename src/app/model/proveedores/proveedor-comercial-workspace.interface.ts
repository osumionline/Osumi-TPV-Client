import type ComercialFormModel from '@model/proveedores/comercial-form.model';
import type ProveedorComercialState from '@model/proveedores/proveedor-comercial-state.type';

export default interface ProveedorComercialWorkspace {
  readonly comercialId: number | null;
  readonly comercialPublicId: string | null;
  readonly state: ProveedorComercialState;
  readonly draft: ComercialFormModel;
  readonly baseSnapshot: ComercialFormModel;
}
