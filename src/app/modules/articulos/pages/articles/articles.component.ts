import {
  Component,
  computed,
  inject,
  OnInit,
  signal,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import HeaderComponent from '@app/components/header/header.component';
import type { ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';
import type ArticuloWorkspaceSection from '@model/articulos/articulo-workspace-section.type';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import type ArticuloVenta from '@model/ventas/articulo-venta.model';
import ArticleWorkspaceComponent from '@modules/articulos/components/article-workspace/article-workspace.component';
import ArticlesTabsComponent from '@modules/articulos/components/articles-tabs/articles-tabs.component';
import ArticleSearchComponent from '@modules/ventas/components/article-search/article-search.component';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/app-data.service';
import ArticulosService from '@services/articulos.service';
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
export default class ArticlesComponent implements OnInit {
  private readonly dialog: DialogService = inject(DialogService);
  readonly appDataService: AppDataService = inject(AppDataService);
  readonly articulosService: ArticulosService = inject(ArticulosService);

  readonly appName: Signal<string> = computed((): string => {
    const appData = this.appDataService.appData();

    return appData?.nombre || appData?.nombreComercial || 'Osumi TPV';
  });
  readonly searching: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchOpen: WritableSignal<boolean> = signal<boolean>(false);
  readonly searchInitialQuery: WritableSignal<string> = signal<string>('');
  readonly searchSourceTabId: WritableSignal<string | null> = signal<string | null>(null);
  readonly processingTabId: WritableSignal<string | null> = signal<string | null>(null);
  readonly savedTabId: WritableSignal<string | null> = signal<string | null>(null);

  private saveFeedbackTimeoutId: number | null = null;

  /**
   * Carga la configuración general utilizada por el módulo.
   */
  ngOnInit(): void {
    void this.loadAppData();
  }

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
   * Aplica una modificación al draft de una ficha abierta.
   */
  updateArticleDraft(change: {
    readonly idTemporal: string;
    readonly patch: ArticuloDraftPatch;
  }): void {
    this.clearSaveFeedback(change.idTemporal);
    this.articulosService.actualizarDraft(change.idTemporal, change.patch);
  }

  /**
   * Cambia la sección interna de una ficha.
   */
  selectArticleSection(change: {
    readonly idTemporal: string;
    readonly section: ArticuloWorkspaceSection;
  }): void {
    this.articulosService.seleccionarSeccion(change.idTemporal, change.section);
  }

  /**
   * Abre el buscador recordando la ficha desde la que
   * se ha iniciado la operación.
   */
  openSearch(query: string = '', sourceTabId: string | null = null): void {
    this.searchInitialQuery.set(query);
    this.searchSourceTabId.set(sourceTabId);
    this.searchOpen.set(true);
  }

  /**
   * Cierra el buscador de artículos.
   */
  closeSearch(): void {
    this.searchOpen.set(false);
    this.searchSourceTabId.set(null);
  }

  /**
   * Resuelve un localizador, acceso directo o código de barras.
   */
  async resolveArticleCode(codigo: string, sourceTabId: string): Promise<void> {
    if (this.searching()) {
      return;
    }

    this.searching.set(true);

    try {
      const tab: ArticuloWorkspaceTab | null = await this.articulosService.resolverPorCodigo(
        codigo,
        sourceTabId,
      );

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
    const sourceTabId: string | null = this.searchSourceTabId();

    this.searchOpen.set(false);
    this.searchSourceTabId.set(null);

    if (this.searching()) {
      return;
    }

    this.searching.set(true);

    try {
      for (let index: number = 0; index < articulos.length; index++) {
        const articulo: ArticuloVenta = articulos[index];
        const tab: ArticuloWorkspaceTab | null = await this.articulosService.cargarPorId(
          articulo.id,
          index === 0 ? sourceTabId : null,
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

        void this.closeArticleDiscardingChanges(idTemporal);
      });
  }

  /**
   * Indica si una ficha está ejecutando una acción persistente.
   */
  isProcessing(idTemporal: string): boolean {
    return this.processingTabId() === idTemporal;
  }

  /**
   * Guarda globalmente la ficha indicada.
   */
  async saveArticle(idTemporal: string): Promise<void> {
    if (this.processingTabId() !== null) {
      return;
    }

    this.clearSaveFeedback();
    this.processingTabId.set(idTemporal);

    try {
      await this.articulosService.guardar(idTemporal);
      this.showSaveFeedback(idTemporal);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido guardar el artículo.'),
        })
        .subscribe();
    } finally {
      this.processingTabId.set(null);
    }
  }

  /**
   * Solicita confirmación antes de restaurar
   * el snapshot persistido de una ficha.
   */
  cancelArticle(idTemporal: string): void {
    if (this.processingTabId() !== null) {
      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content: '¿Quieres descartar todos los cambios realizados en esta ficha?',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        void this.discardArticleChanges(idTemporal);
      });
  }

  /**
   * Solicita confirmación antes de crear una copia
   * editable del artículo actual.
   */
  duplicateArticle(idTemporal: string): void {
    if (this.processingTabId() !== null) {
      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar',
        content: '¿Quieres duplicar este artículo y crear uno nuevo?',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        try {
          this.clearSaveFeedback();
          this.articulosService.duplicar(idTemporal);
        } catch (error: unknown) {
          this.dialog
            .alert({
              title: 'Error',
              content: getErrorMessage(error, 'No se ha podido duplicar el artículo.'),
            })
            .subscribe();
        }
      });
  }

  /**
   * Solicita confirmación antes de dar de baja
   * definitivamente un artículo activo.
   */
  deactivateArticle(idTemporal: string): void {
    if (this.processingTabId() !== null) {
      return;
    }

    const tab: ArticuloWorkspaceTab | undefined = this.articulosService
      .tabs()
      .find((item: ArticuloWorkspaceTab): boolean => item.idTemporal === idTemporal);

    if (tab === undefined || tab.draft.id === null) {
      return;
    }

    if (tab.dirty) {
      this.dialog
        .alert({
          title: 'Atención',
          content: 'Guarda o cancela los cambios antes de dar de baja el artículo.',
        })
        .subscribe();

      return;
    }

    this.dialog
      .confirm({
        title: 'Confirmar baja',
        content:
          `¿Estás seguro de querer dar de baja "${tab.draft.nombre}"? ` +
          'El artículo dejará de estar disponible en el TPV, ' +
          'pero sus datos históricos se conservarán.',
      })
      .subscribe((result: boolean): void => {
        if (!result) {
          return;
        }

        void this.confirmDeactivateArticle(idTemporal);
      });
  }

  /**
   * Ejecuta la baja confirmada y mantiene la ficha
   * abierta cuando la operación falla.
   */
  private async confirmDeactivateArticle(idTemporal: string): Promise<void> {
    if (this.processingTabId() !== null) {
      return;
    }

    this.clearSaveFeedback();
    this.processingTabId.set(idTemporal);

    try {
      await this.articulosService.darDeBaja(idTemporal);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se ha podido dar de baja el artículo.'),
        })
        .subscribe();
    } finally {
      this.processingTabId.set(null);
    }
  }

  /**
   * Muestra temporalmente la confirmación de guardado
   * correspondiente a una ficha.
   */
  private showSaveFeedback(idTemporal: string): void {
    this.clearSaveFeedback();
    this.savedTabId.set(idTemporal);

    this.saveFeedbackTimeoutId = window.setTimeout((): void => {
      if (this.savedTabId() === idTemporal) {
        this.savedTabId.set(null);
      }

      this.saveFeedbackTimeoutId = null;
    }, 4_000);
  }

  /**
   * Oculta la confirmación de guardado activa.
   *
   * Cuando se indica una ficha, solo la elimina si
   * pertenece a esa misma ficha.
   */
  private clearSaveFeedback(idTemporal: string | null = null): void {
    if (idTemporal !== null && this.savedTabId() !== idTemporal) {
      return;
    }

    if (this.saveFeedbackTimeoutId !== null) {
      window.clearTimeout(this.saveFeedbackTimeoutId);
      this.saveFeedbackTimeoutId = null;
    }

    this.savedTabId.set(null);
  }

  /**
   * Limpia imágenes temporales y restaura el snapshot.
   */
  private async discardArticleChanges(idTemporal: string): Promise<void> {
    if (this.processingTabId() !== null) {
      return;
    }

    this.processingTabId.set(idTemporal);

    try {
      await this.articulosService.descartarCambios(idTemporal);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(error, 'No se han podido descartar los cambios del artículo.'),
        })
        .subscribe();
    } finally {
      this.processingTabId.set(null);
    }
  }

  /**
   * Descarta temporales y cierra una ficha cuyos
   * cambios ya han sido confirmados como descartables.
   */
  private async closeArticleDiscardingChanges(idTemporal: string): Promise<void> {
    try {
      await this.articulosService.cerrarTabDescartandoCambios(idTemporal);
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(
            error,
            'No se han podido limpiar los archivos temporales de la ficha.',
          ),
        })
        .subscribe();
    }
  }

  /**
   * Precarga AppData para los consumidores del módulo de Artículos.
   */
  private async loadAppData(): Promise<void> {
    try {
      await this.appDataService.load();
    } catch (error: unknown) {
      this.dialog
        .alert({
          title: 'Error',
          content: getErrorMessage(
            error,
            'No se ha podido cargar la configuración de la aplicación.',
          ),
        })
        .subscribe();
    }
  }
}
