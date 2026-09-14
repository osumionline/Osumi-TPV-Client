import type { Signal, WritableSignal } from '@angular/core';
import { Service, signal } from '@angular/core';
import type CategoriaInterface from '@desktop-contracts/categorias/categoria.interface';
import Categoria from '@model/categorias/categoria.model';

interface CategoriasState {
  readonly tree: readonly Categoria[];
  readonly plain: readonly Categoria[];
}

@Service()
export default class CategoriasService {
  private readonly categoriasSignal: WritableSignal<readonly Categoria[]> = signal<
    readonly Categoria[]
  >([]);
  private readonly categoriasPlainSignal: WritableSignal<readonly Categoria[]> = signal<
    readonly Categoria[]
  >([]);
  private readonly loadedSignal: WritableSignal<boolean> = signal<boolean>(false);

  private pendingRequest: Promise<void> | null = null;

  readonly categorias: Signal<readonly Categoria[]> = this.categoriasSignal.asReadonly();
  readonly categoriasPlain: Signal<readonly Categoria[]> = this.categoriasPlainSignal.asReadonly();
  readonly loaded: Signal<boolean> = this.loadedSignal.asReadonly();

  load(): Promise<void> {
    if (this.loaded()) {
      return Promise.resolve();
    }

    return this.loadData();
  }

  reload(): Promise<void> {
    return this.loadData();
  }

  clear(): void {
    this.categoriasSignal.set([]);
    this.categoriasPlainSignal.set([]);
    this.loadedSignal.set(false);
  }

  findById(id: number): Categoria | null {
    return (
      this.categoriasPlain().find((categoria: Categoria): boolean => categoria.id === id) ?? null
    );
  }

  findByPublicId(publicId: string): Categoria | null {
    return (
      this.categoriasPlain().find(
        (categoria: Categoria): boolean => categoria.publicId === publicId,
      ) ?? null
    );
  }

  private loadData(): Promise<void> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestCategorias();

    return this.pendingRequest;
  }

  private async requestCategorias(): Promise<void> {
    try {
      const result: readonly CategoriaInterface[] = await window.osumiDesktop.categorias.getAll();

      const state: CategoriasState = this.buildState(result);

      this.categoriasSignal.set(state.tree);
      this.categoriasPlainSignal.set(state.plain);
      this.loadedSignal.set(true);
    } finally {
      this.pendingRequest = null;
    }
  }

  private buildState(result: readonly CategoriaInterface[]): CategoriasState {
    const categorias: Categoria[] = result.map((categoria: CategoriaInterface): Categoria =>
      new Categoria().fromInterface(categoria),
    );

    const categoriasById: Map<number, Categoria> = new Map<number, Categoria>();

    for (const categoria of categorias) {
      if (categoria.id === null) {
        throw new Error('Se ha recibido una categoría sin identificador.');
      }

      categoriasById.set(categoria.id, categoria);
    }

    const tree: Categoria[] = [];

    for (const categoria of categorias) {
      if (categoria.idPadre === null) {
        tree.push(categoria);
        continue;
      }

      const padre: Categoria | undefined = categoriasById.get(categoria.idPadre);

      if (padre === undefined) {
        throw new Error(
          `La categoría "${categoria.nombre}" referencia una categoría padre no disponible.`,
        );
      }

      padre.hijos.push(categoria);
    }

    const plain: Categoria[] = [];
    const visited: Set<number> = new Set<number>();
    const visiting: Set<number> = new Set<number>();

    for (const categoria of tree) {
      this.appendToPlain(categoria, 1, plain, visited, visiting);
    }

    if (visited.size !== categorias.length) {
      throw new Error('La jerarquía de categorías contiene una relación circular o inaccesible.');
    }

    return {
      tree,
      plain,
    };
  }

  private appendToPlain(
    categoria: Categoria,
    profundidad: number,
    plain: Categoria[],
    visited: Set<number>,
    visiting: Set<number>,
  ): void {
    if (categoria.id === null) {
      throw new Error('Se ha encontrado una categoría sin identificador.');
    }

    if (visiting.has(categoria.id)) {
      throw new Error(
        `Se ha detectado una relación circular en la categoría "${categoria.nombre}".`,
      );
    }

    if (visited.has(categoria.id)) {
      return;
    }

    visiting.add(categoria.id);

    categoria.profundidad = profundidad;
    plain.push(categoria);

    for (const hijo of categoria.hijos) {
      this.appendToPlain(hijo, profundidad + 1, plain, visited, visiting);
    }

    visiting.delete(categoria.id);
    visited.add(categoria.id);
  }
}
