import {
  Component,
  computed,
  inject,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import HeaderComponent from '@app/components/header/header.component';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import ArticleWorkspaceComponent from '@modules/articulos/components/article-workspace/article-workspace.component';
import ArticlesTabsComponent from '@modules/articulos/components/articles-tabs/articles-tabs.component';
import ArticleSearchComponent from '@modules/ventas/components/article-search/article-search.component';
import { DialogService } from '@osumi/angular-tools';
import ArticulosService from '@services/articulos.service';
import VentasContextService from '@services/ventas-context.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Página principal del módulo de Artículos.
 */
@Component({
  selector: 'otpv-articles',
  templateUrl: './articles.component.html',
  styleUrl: './articles.component.scss',
  imports: [
    ArticleSearchComponent,
    ArticlesTabsComponent,
    ArticleWorkspaceComponent,
    HeaderComponent,
    MatButton,
  ],
})
export default class ArticlesComponent {
  private readonly dialog: DialogService = inject(DialogService);
  private readonly ventasContextService: VentasContextService = inject(VentasContextService);
  readonly articulosService: ArticulosService = inject(ArticulosService);
  readonly appName: Signal<string> = computed((): string => {
    const appData = this.ventasContextService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });
  readonly searching: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchInitialQuery: WritableSignal<string> = signal<string>('');

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
   * Actualiza el nombre editable de una ficha.
   */
  updateArticleName(change: { readonly idTemporal: string; readonly nombre: string }): void {
    this.articulosService.actualizarDraft(change.idTemporal, {
      nombre: change.nombre,
    });
  }

  /**
   * Abre el buscador de artículos con el texto indicado.
   */
  openSearch(query: string = ''): void {
    this.searchInitialQuery.set(query);
    this.searchOpen.set(true);
  }

  /**
   * Cierra el buscador de artículos.
   */
  closeSearch(): void {
    this.searchOpen.set(false);
  }

  /**
   * Resuelve un localizador, acceso directo o código de barras.
   */
  async resolveArticleCode(codigo: string): Promise<void> {
    if (this.searching()) {
      return;
    }

    this.searching.set(true);

    try {
      const tab: ArticuloWorkspaceTab | null =
        await this.articulosService.resolverPorCodigo(codigo);

      if (tab !== null) {
        return;
      }

      this.dialog
        .alert({
          title: 'Atención',
          content: 'El código introducido no se encuentra.',
        })
        .subscribe();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido cargar el artículo.'),
        })
        .subscribe();
    } finally {
      this.searching.set(false);
    }
  }

  /**
   * Abre las fichas seleccionadas desde el buscador.
   */
  async openSearchSelection(articulos: readonly ArticuloVenta[]): Promise<void> {
    this.searchOpen.set(false);

    if (this.searching()) {
      return;
    }

    this.searching.set(true);

    try {
      for (const articulo of articulos) {
        const tab: ArticuloWorkspaceTab | null = await this.articulosService.cargarPorId(
          articulo.id,
        );

        if (tab === null) {
          throw new Error(`El artículo "${articulo.nombre}" ya no está disponible.`);
        }
      }
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se han podido abrir los artículos seleccionados.'),
        })
        .subscribe();
    } finally {
      this.searching.set(false);
    }
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
