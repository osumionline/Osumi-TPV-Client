import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import type ClienteWorkspaceSection from '@model/clientes/cliente-workspace-section.type';
import type ClienteWorkspace from '@model/clientes/cliente-workspace.interface';

interface ClientSectionDefinition {
  readonly id: ClienteWorkspaceSection;
  readonly label: string;
}

const CLIENT_SECTIONS: readonly ClientSectionDefinition[] = [
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

const NEW_CLIENT_HIDDEN_SECTIONS: ReadonlySet<ClienteWorkspaceSection> =
  new Set<ClienteWorkspaceSection>(['invoices', 'sales', 'statistics']);

/**
 * Muestra las secciones disponibles de la ficha de cliente.
 */
@Component({
  selector: 'otpv-client-section-tabs',
  templateUrl: './client-section-tabs.component.html',
  styleUrl: './client-section-tabs.component.scss',
})
export default class ClientSectionTabsComponent {
  readonly workspace: InputSignal<ClienteWorkspace> = input.required<ClienteWorkspace>();
  readonly disabled: InputSignal<boolean> = input<boolean>(false);
  readonly selectSectionEvent: OutputEmitterRef<ClienteWorkspaceSection> =
    output<ClienteWorkspaceSection>();

  /**
   * Obtiene las secciones visibles para la ficha actual.
   */
  getSections(): readonly ClientSectionDefinition[] {
    if (this.workspace().clienteId !== null) {
      return CLIENT_SECTIONS;
    }

    return CLIENT_SECTIONS.filter(
      (section: ClientSectionDefinition): boolean => !NEW_CLIENT_HIDDEN_SECTIONS.has(section.id),
    );
  }

  /**
   * Solicita cambiar la sección activa.
   */
  selectSection(section: ClienteWorkspaceSection): void {
    if (this.disabled()) {
      return;
    }

    this.selectSectionEvent.emit(section);
  }
}
