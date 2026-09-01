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
import { MatIcon } from '@angular/material/icon';
import type ArticuloAccesoDirectoInterface from '@desktop-contracts/articulos/articulo-acceso-directo.interface';
import type ArticuloWorkspaceTab from '@model/articulos/articulo-workspace-tab.interface';
import ArticulosService from '@services/articulos.service';
import { getErrorMessage } from '@utils/error.utils';

/**
 * Gestiona los accesos directos asignados a artículos.
 */
@Component({
  selector: 'otpv-article-direct-accesses',
  templateUrl: './article-direct-accesses.component.html',
  styleUrl: './article-direct-accesses.component.scss',
  imports: [MatButton, MatIcon],
})
export default class ArticleDirectAccessesComponent implements OnInit {
  private readonly articulosService: ArticulosService = inject(ArticulosService);

  readonly tab: InputSignal<ArticuloWorkspaceTab> = input.required<ArticuloWorkspaceTab>();
  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly accesos: WritableSignal<readonly ArticuloAccesoDirectoInterface[]> = signal<
    readonly ArticuloAccesoDirectoInterface[]
  >([]);
  readonly loading: WritableSignal<boolean> = signal<boolean>(true);
  readonly saving: WritableSignal<boolean> = signal<boolean>(false);
  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  /**
   * Carga la lista global al abrir el modal.
   */
  ngOnInit(): void {
    void this.load();
  }

  /**
   * Asigna o sustituye el acceso directo de la ficha actual.
   */
  async assign(value: string): Promise<void> {
    const idArticulo: number | null = this.tab().draft.id;

    if (idArticulo === null || this.saving()) {
      return;
    }

    const accesoDirecto: number = Number(value);

    if (!Number.isSafeInteger(accesoDirecto) || accesoDirecto <= 0) {
      this.error.set('El acceso directo debe ser un entero positivo.');

      return;
    }

    await this.persist(idArticulo, accesoDirecto);
  }

  /**
   * Elimina un acceso directo existente.
   */
  async remove(idArticulo: number): Promise<void> {
    if (this.saving()) {
      return;
    }

    await this.persist(idArticulo, null);
  }

  /**
   * Cierra el modal cuando no existe una operación en curso.
   */
  close(): void {
    if (!this.saving()) {
      this.closeEvent.emit();
    }
  }

  /**
   * Carga los accesos directos actuales.
   */
  private async load(): Promise<void> {
    this.loading.set(true);
    this.error.set(null);

    try {
      this.accesos.set(await this.articulosService.getAccesosDirectos());
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se han podido cargar los accesos directos.'));
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Persiste un cambio y refresca la lista.
   */
  private async persist(idArticulo: number, accesoDirecto: number | null): Promise<void> {
    this.saving.set(true);
    this.error.set(null);

    try {
      await this.articulosService.setAccesoDirecto(idArticulo, accesoDirecto);

      try {
        this.accesos.set(await this.articulosService.getAccesosDirectos());
      } catch (error: unknown) {
        this.error.set(
          getErrorMessage(
            error,
            'El acceso directo se ha actualizado, pero no se ha podido refrescar la lista.',
          ),
        );
      }
    } catch (error: unknown) {
      this.error.set(getErrorMessage(error, 'No se ha podido actualizar el acceso directo.'));
    } finally {
      this.saving.set(false);
    }
  }
}
