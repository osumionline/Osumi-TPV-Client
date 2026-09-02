import { DatePipe } from '@angular/common';
import {
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  type AfterViewInit,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type Cliente from '@model/clientes/cliente.model';
import { normalizeTextForSearch } from '@utils/string.utils';

/**
 * Busca clientes sobre la colección ya cargada en memoria.
 */
@Component({
  selector: 'otpv-client-search',
  templateUrl: './client-search.component.html',
  styleUrl: './client-search.component.scss',
  imports: [DatePipe, MatIcon, MatIconButton],
})
export default class ClientSearchComponent implements AfterViewInit {
  readonly clientes: InputSignal<readonly Cliente[]> = input.required<readonly Cliente[]>();
  readonly selectedPublicId: InputSignal<string | null> = input<string | null>(null);

  readonly selectEvent: OutputEmitterRef<Cliente> = output<Cliente>();
  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly query: WritableSignal<string> = signal<string>('');
  readonly normalizedQuery: Signal<string> = computed((): string =>
    normalizeTextForSearch(this.query()),
  );
  readonly filteredClientes: Signal<readonly Cliente[]> = computed((): readonly Cliente[] => {
    const query: string = this.normalizedQuery();

    if (query === '') {
      return [];
    }

    return this.clientes().filter((cliente: Cliente): boolean =>
      [cliente.nombreApellidos, cliente.dniCif, cliente.telefono, cliente.email].some(
        (value: string | null): boolean => normalizeTextForSearch(value).includes(query),
      ),
    );
  });

  private readonly searchInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  /**
   * Sitúa el foco inicial en el buscador.
   */
  ngAfterViewInit(): void {
    this.searchInput().nativeElement.focus();
  }

  /**
   * Actualiza el texto utilizado para filtrar clientes.
   */
  updateQuery(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.query.set(inputElement.value);
  }

  /**
   * Devuelve el cliente elegido a la página principal.
   */
  select(cliente: Cliente): void {
    this.selectEvent.emit(cliente);
  }

  /**
   * Cierra el buscador sin realizar cambios.
   */
  cancel(): void {
    this.cancelEvent.emit();
  }
}
