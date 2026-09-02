import type ClienteFormModel from '@model/clientes/cliente-form.model';
import type ClienteWorkspaceSection from '@model/clientes/cliente-workspace-section.type';

export default interface ClienteWorkspace {
  readonly clienteId: number | null;
  readonly clientePublicId: string | null;
  readonly draft: ClienteFormModel;
  readonly baseSnapshot: ClienteFormModel;
  readonly dirty: boolean;
  readonly activeSection: ClienteWorkspaceSection;
}
