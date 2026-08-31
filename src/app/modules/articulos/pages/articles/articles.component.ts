import { Component, computed, inject, type Signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import HeaderComponent from '@app/components/header/header.component';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import ArticlesTabsComponent from '@modules/articulos/components/articles-tabs/articles-tabs.component';
import { DialogService } from '@osumi/angular-tools';
import ArticulosService from '@services/articulos.service';
import VentasContextService from '@services/ventas-context.service';

/**
 * Página principal del módulo de Artículos.
 */
@Component({
  selector: 'otpv-articles',
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss',
  imports: [ArticlesTabsComponent, HeaderComponent, MatButton],
})
export default class ArticlesComponent {
  private readonly dialog: DialogService = inject(DialogService);
  private readonly ventasContextService: VentasContextService = inject(VentasContextService);
  readonly articulosService: ArticulosService = inject(ArticulosService);
  readonly appName: Signal<string> = computed((): string => {
    const appData = this.ventasContextService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });

  /**
   * Crea una nueva ficha temporal.
   */
  newArticle(): void {
    this.articulosService.crearBorrador();
  }

  /**
   * Cambia la ficha activa.
   */
  selectArticle(idTemporal: string): void {
    this.articulosService.seleccionarTab(idTemporal);
  }

  /**
   * Cierra una ficha, solicitando confirmación cuando contiene cambios.
   */
  closeArticle(idTemporal: string): void {
    const tab: ArticuloWorkspaceTab | undefined = this.articulosService
      .tabs()
      .find((item: ArticuloWorkspaceTab): boolean => item.idTemporal === idTemporal);

    if (tab === undefined) {
      return;
    }

    if (!tab.dirty) {
      this.articulosService.cerrarTab(idTemporal);
      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content:
          'La ficha contiene cambios sin guardar. ¿Estás seguro de querer cerrarla y perder esos cambios?',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        this.articulosService.cerrarTab(idTemporal);
      });
  }
}
