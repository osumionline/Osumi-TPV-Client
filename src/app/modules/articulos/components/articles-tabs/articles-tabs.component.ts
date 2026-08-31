import { Component, input, output, type InputSignal, type OutputEmitterRef } from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';

/**
 * Muestra las fichas de Artículos abiertas durante la sesión.
 */
@Component({
  selector: 'otpv-articles-tabs',
  templateUrl: './articles-tabs.component.html',
  styleUrl: './articles-tabs.component.scss',
  imports: [MatIcon, MatTooltip],
})
export default class ArticlesTabsComponent {
  readonly tabs: InputSignal<readonly ArticuloWorkspaceTab[]> =
    input.required<readonly ArticuloWorkspaceTab[]>();
  readonly selectedId: InputSignal<string | null> = input.required<string | null>();
  readonly selectTabEvent: OutputEmitterRef<string> = output<string>();
  readonly closeTabEvent: OutputEmitterRef<string> = output<string>();
  readonly newTabEvent: OutputEmitterRef<void> = output<void>();

  /**
   * Obtiene el texto visible de una pestaña.
   */
  getTabLabel(tab: ArticuloWorkspaceTab): string {
    const nombre: string = tab.draft.nombre.trim();

    if (tab.draft.id === null) {
      return nombre || 'Artículo nuevo';
    }

    if (nombre !== '') {
      return tab.draft.localizador === null ? nombre : `${tab.draft.localizador} · ${nombre}`;
    }

    return tab.draft.localizador === null ? 'Artículo' : `Artículo ${tab.draft.localizador}`;
  }

  /**
   * Selecciona la pestaña indicada.
   */
  selectTab(idTemporal: string): void {
    this.selectTabEvent.emit(idTemporal);
  }

  /**
   * Solicita el cierre de una pestaña sin propagar el click.
   */
  closeTab(event: MouseEvent, idTemporal: string): void {
    event.stopPropagation();
    this.closeTabEvent.emit(idTemporal);
  }

  /**
   * Solicita la creación de una nueva ficha.
   */
  newTab(): void {
    this.newTabEvent.emit();
  }
}
