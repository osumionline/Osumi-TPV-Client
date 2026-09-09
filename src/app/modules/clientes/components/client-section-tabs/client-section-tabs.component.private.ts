import type ClienteWorkspaceSection from '@model/clientes/cliente-workspace-section.type';

export interface ClientSectionDefinition {
  readonly id: ClienteWorkspaceSection;
  readonly label: string;
}

export const CLIENT_SECTIONS: readonly ClientSectionDefinition[] = [
  {
    id: 'data',
    label: 'DATOS',
  },
  {
    id: 'billing',
    label: 'DATOS DE FACTURACIÓN',
  },
  {
    id: 'invoices',
    label: 'FACTURAS',
  },
  {
    id: 'sales',
    label: 'VENTAS',
  },
  {
    id: 'statistics',
    label: 'ESTADÍSTICAS',
  },
];

export const NEW_CLIENT_HIDDEN_SECTIONS: ReadonlySet<ClienteWorkspaceSection> =
  new Set<ClienteWorkspaceSection>(['invoices', 'sales', 'statistics']);
