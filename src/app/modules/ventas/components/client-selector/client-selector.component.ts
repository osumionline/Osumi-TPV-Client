import {
  afterNextRender,
  Component,
  computed,
  ElementRef,
  input,
  output,
  signal,
  viewChild,
  type InputSignal,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton } from '@angular/material/button';
import type Cliente from '@model/clientes/cliente.model';

@Component({
  selector: 'otpv-client-selector',
  templateUrl: './client-selector.component.html',
  styleUrl: './client-selector.component.scss',
  imports: [MatButton],
})
export default class ClientSelectorComponent {
  readonly clientes: InputSignal<readonly Cliente[]> = input.required<readonly Cliente[]>();

  readonly selectedPublicId: InputSignal<string | null> = input<string | null>(null);

  readonly selectEvent: OutputEmitterRef<Cliente> = output<Cliente>();
  readonly clearEvent: OutputEmitterRef<void> = output<void>();
  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly query: WritableSignal<string> = signal<string>('');

  readonly filteredClientes: Signal<readonly Cliente[]> = computed((): readonly Cliente[] => {
    const query: string = this.normalizeSearchValue(this.query());

    if (query === '') {
      return this.clientes();
    }

    return this.clientes().filter((cliente: Cliente): boolean =>
      [cliente.nombreApellidos, cliente.dniCif, cliente.telefono, cliente.email].some(
        (value: string | null): boolean => this.normalizeSearchValue(value).includes(query),
      ),
    );
  });

  private readonly searchInput = viewChild.required<ElementRef<HTMLInputElement>>('searchInput');

  constructor() {
    afterNextRender((): void => {
      this.searchInput().nativeElement.focus();
    });
  }

  /**
   * Actualiza el texto utilizado para filtrar los clientes disponibles.
   */
  updateQuery(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.query.set(inputElement.value);
  }

  /**
   * Selecciona el cliente indicado.
   */
  select(cliente: Cliente): void {
    this.selectEvent.emit(cliente);
  }

  /**
   * Elimina el cliente actualmente asociado a la venta.
   */
  clear(): void {
    this.clearEvent.emit();
  }

  /**
   * Cierra el selector sin modificar la venta.
   */
  cancel(): void {
    this.cancelEvent.emit();
  }

  /**
   * Normaliza un valor para realizar búsquedas sin distinguir
   * mayúsculas, minúsculas ni acentos.
   */
  private normalizeSearchValue(value: string | null): string {
    return (value ?? '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLocaleLowerCase('es-ES')
      .trim();
  }
}
