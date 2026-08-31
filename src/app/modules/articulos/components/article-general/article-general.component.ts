import {
  Component,
  inject,
  input,
  OnInit,
  output,
  signal,
  type InputSignal,
  type OutputEmitterRef,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import type { ArticuloDraftPatch } from '@model/articulos/articulo-draft.interface';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import type Categoria from '@model/categorias/categoria.model';
import CategoriasService from '@services/categorias.service';
import MarcasService from '@services/marcas.service';
import ProveedoresService from '@services/proveedores.service';
import { getErrorMessage } from '@utils/error.utils';

type ArticleIntegerField = 'stock' | 'stockMin' | 'stockMax' | 'loteOptimo';

/**
 * Edita los datos generales de una ficha de artículo.
 */
@Component({
  selector: 'otpv-article-general',
  templateUrl: './article-general.component.html',
  styleUrl: './article-general.component.scss',
  imports: [MatButton],
})
export default class ArticleGeneralComponent implements OnInit {
  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly draftChangeEvent: OutputEmitterRef<ArticuloDraftPatch> = output<ArticuloDraftPatch>();

  readonly marcasService: MarcasService = inject(MarcasService);
  readonly proveedoresService: ProveedoresService = inject(ProveedoresService);
  readonly categoriasService: CategoriasService = inject(CategoriasService);

  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly loadError: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Carga los datos maestros necesarios para General.
   */
  ngOnInit(): void {
    void this.loadMasterData();
  }

  /**
   * Actualiza la marca seleccionada.
   */
  onMarcaChange(event: Event): void {
    const selectElement: HTMLSelectElement = event.target as HTMLSelectElement;

    this.draftChangeEvent.emit({
      idMarca: this.parseSelectedId(selectElement.value),
    });
  }

  /**
   * Actualiza el proveedor seleccionado.
   */
  onProveedorChange(event: Event): void {
    const selectElement: HTMLSelectElement = event.target as HTMLSelectElement;

    this.draftChangeEvent.emit({
      idProveedor: this.parseSelectedId(selectElement.value),
    });
  }

  /**
   * Añade o elimina una categoría del artículo.
   */
  onCategoriaChange(event: Event, idCategoria: number): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const idsCategorias: Set<number> = new Set<number>(this.tab().draft.idsCategorias);

    if (inputElement.checked) {
      idsCategorias.add(idCategoria);
    } else {
      idsCategorias.delete(idCategoria);
    }

    this.draftChangeEvent.emit({
      idsCategorias: [...idsCategorias],
    });
  }

  /**
   * Actualiza la referencia.
   */
  onReferenciaInput(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.draftChangeEvent.emit({
      referencia: inputElement.value,
    });
  }

  /**
   * Actualiza el acceso directo opcional.
   */
  onAccesoDirectoChange(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    if (inputElement.value.trim() === '') {
      this.draftChangeEvent.emit({
        accesoDirecto: null,
      });

      return;
    }

    const value: number = inputElement.valueAsNumber;

    if (!Number.isSafeInteger(value) || value <= 0) {
      return;
    }

    this.draftChangeEvent.emit({
      accesoDirecto: value,
    });
  }

  /**
   * Activa o desactiva la preparación del artículo para venta online.
   */
  onVentaOnlineChange(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.draftChangeEvent.emit({
      ventaOnline: inputElement.checked,
    });
  }

  /**
   * Actualiza uno de los campos enteros de stock.
   */
  onIntegerChange(event: Event, field: ArticleIntegerField, nonNegative: boolean): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;
    const rawValue: number = inputElement.valueAsNumber;

    if (!Number.isFinite(rawValue)) {
      return;
    }

    const value: number = nonNegative ? Math.max(0, Math.trunc(rawValue)) : Math.trunc(rawValue);

    switch (field) {
      case 'stock':
        this.draftChangeEvent.emit({
          stock: value,
        });
        return;

      case 'stockMin':
        this.draftChangeEvent.emit({
          stockMin: value,
        });
        return;

      case 'stockMax':
        this.draftChangeEvent.emit({
          stockMax: value,
        });
        return;

      case 'loteOptimo':
        this.draftChangeEvent.emit({
          loteOptimo: value,
        });
        return;
    }
  }

  /**
   * Indica si una categoría pertenece al artículo.
   */
  isCategoriaSelected(categoria: Categoria): boolean {
    return categoria.id !== null && this.tab().draft.idsCategorias.includes(categoria.id);
  }

  /**
   * Obtiene la sangría visual de una categoría jerárquica.
   */
  getCategoriaIndent(categoria: Categoria): number {
    return Math.max(0, categoria.profundidad - 1) * 18;
  }

  /**
   * Reintenta la carga de datos maestros.
   */
  retry(): void {
    void this.loadMasterData();
  }

  /**
   * Carga Marca, Proveedor y Categorías en paralelo.
   */
  private async loadMasterData(): Promise<void> {
    this.loading.set(true);
    this.loadError.set(null);

    try {
      await Promise.all([
        this.marcasService.load(),
        this.proveedoresService.load(),
        this.categoriasService.load(),
      ]);
    } catch (error: unknown) {
      this.loadError.set(
        getErrorMessage(error, 'No se han podido cargar los datos generales del artículo.'),
      );
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Convierte el valor de un select a identificador persistido.
   */
  private parseSelectedId(value: string): number | null {
    if (value === '') {
      return null;
    }

    const id: number = Number(value);

    return Number.isSafeInteger(id) && id > 0 ? id : null;
  }
}
