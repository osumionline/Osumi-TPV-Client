import {
  afterRenderEffect,
  Component,
  computed,
  ElementRef,
  inject,
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
import createClienteCommand from '@model/clientes/cliente-form-command.mapper';
import type ClienteFormModel from '@model/clientes/cliente-form.model';
import type Cliente from '@model/clientes/cliente.model';
import ClientFormComponent from '@modules/clientes/components/client-form/client-form.component';
import ClientesService from '@services/clientes.service';
import { getErrorMessage } from '@utils/error.utils';
import { normalizeTextForSearch } from '@utils/string.utils';

type ClientSelectorMode = 'search' | 'create';

@Component({
  selector: 'otpv-client-selector',
  templateUrl: './client-selector.component.html',
  styleUrl: './client-selector.component.scss',
  imports: [ClientFormComponent, MatButton],
})
export default class ClientSelectorComponent {
  private readonly clientesService: ClientesService = inject(ClientesService);

  readonly clientes: InputSignal<readonly Cliente[]> = input.required<readonly Cliente[]>();

  readonly selectedPublicId: InputSignal<string | null> = input<string | null>(null);

  readonly selectEvent: OutputEmitterRef<Cliente> = output<Cliente>();

  readonly createdEvent: OutputEmitterRef<Cliente> = output<Cliente>();

  readonly clearEvent: OutputEmitterRef<void> = output<void>();

  readonly cancelEvent: OutputEmitterRef<void> = output<void>();

  readonly mode: WritableSignal<ClientSelectorMode> = signal<ClientSelectorMode>('search');

  readonly query: WritableSignal<string> = signal<string>('');

  readonly saving: WritableSignal<boolean> = signal<boolean>(false);

  readonly creationError: WritableSignal<string | null> = signal<string | null>(null);

  readonly filteredClientes: Signal<readonly Cliente[]> = computed((): readonly Cliente[] => {
    const query: string = normalizeTextForSearch(this.query());

    if (query === '') {
      return this.clientes();
    }

    return this.clientes().filter((cliente: Cliente): boolean =>
      [cliente.nombreApellidos, cliente.dniCif, cliente.telefono, cliente.email].some(
        (value: string | null): boolean => normalizeTextForSearch(value).includes(query),
      ),
    );
  });

  private readonly searchInput: Signal<ElementRef<HTMLInputElement> | undefined> =
    viewChild<ElementRef<HTMLInputElement>>('searchInput');

  private readonly focusSearchRef = afterRenderEffect({
    write: (): void => {
      if (this.mode() !== 'search') {
        return;
      }

      this.searchInput()?.nativeElement.focus();
    },
  });

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
   * Muestra el formulario para crear un cliente.
   */
  openCreate(): void {
    if (this.saving()) {
      return;
    }

    this.creationError.set(null);
    this.mode.set('create');
  }

  /**
   * Vuelve a la búsqueda de clientes sin cerrar el selector.
   */
  openSearch(): void {
    if (this.saving()) {
      return;
    }

    this.creationError.set(null);
    this.mode.set('search');
  }

  /**
   * Crea un cliente y lo devuelve como cliente seleccionado.
   */
  async createCliente(model: ClienteFormModel): Promise<void> {
    if (this.saving()) {
      return;
    }

    this.saving.set(true);
    this.creationError.set(null);

    let cliente: Cliente | null = null;

    try {
      cliente = await this.clientesService.create(createClienteCommand(model));
    } catch (error: unknown) {
      this.creationError.set(getErrorMessage(error, 'No se ha podido crear el cliente.'));
    } finally {
      this.saving.set(false);
    }

    if (cliente !== null) {
      this.createdEvent.emit(cliente);
    }
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
    if (this.saving()) {
      return;
    }

    this.cancelEvent.emit();
  }
}
