import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  signal,
  type InputSignal,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type ClienteFacturaEmailCommand from '@desktop-contracts/clientes/cliente-factura-email-command.interface';
import type {
  ClienteFacturaEstado,
  ClienteFacturaInterface,
} from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteFacturasState from '@model/clientes/cliente-facturas-state.interface';
import ClientInvoiceEmailFormComponent from '@modules/clientes/components/client-invoice-email-form/client-invoice-email-form.component';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import ClientesService from '@services/clientes.service';
import { getErrorMessage } from '@utils/error.utils';

const ESTADO_LABELS: Readonly<Record<ClienteFacturaEstado, string>> = {
  borrador: 'Borrador',
  emitida: 'Emitida',
  anulada: 'Anulada',
};

/**
 * Muestra las facturas asociadas a un cliente persistido.
 */
@Component({
  selector: 'otpv-client-invoices',
  templateUrl: './client-invoices.component.html',
  styleUrl: './client-invoices.component.scss',
  imports: [
    ClientInvoiceEmailFormComponent,
    CentsToEurosPipe,
    CurrencyPipe,
    DatePipe,
    MatButton,
    MatIcon,
    MatIconButton,
    MatTooltip,
  ],
})
export default class ClientInvoicesComponent implements OnInit {
  private readonly clientesService: ClientesService = inject(ClientesService);

  readonly clientePublicId: InputSignal<string> = input.required<string>();
  readonly disabled: InputSignal<boolean> = input<boolean>(false);
  readonly createDisabled: InputSignal<boolean> = input<boolean>(false);
  readonly emailConfigured: InputSignal<boolean> = input<boolean>(false);
  readonly clienteEmail: InputSignal<string> = input<string>('');
  readonly openFacturaEvent: OutputEmitterRef<ClienteFacturaInterface> =
    output<ClienteFacturaInterface>();
  readonly newFacturaEvent: OutputEmitterRef<void> = output<void>();
  readonly printFacturaEvent: OutputEmitterRef<ClienteFacturaInterface> =
    output<ClienteFacturaInterface>();
  readonly actionProcessingEvent: OutputEmitterRef<boolean> = output<boolean>();

  readonly state: Signal<ClienteFacturasState> = computed((): ClienteFacturasState =>
    this.clientesService.getFacturasState(this.clientePublicId()),
  );
  readonly facturas: Signal<readonly ClienteFacturaInterface[]> = computed(
    (): readonly ClienteFacturaInterface[] => this.state().data ?? [],
  );

  readonly emailFacturaSeleccionada: WritableSignal<ClienteFacturaInterface | null> =
    signal<ClienteFacturaInterface | null>(null);
  readonly emailSending: WritableSignal<boolean> = signal<boolean>(false);
  readonly actionError: WritableSignal<string | null> = signal<string | null>(null);
  readonly actionInfo: WritableSignal<string | null> = signal<string | null>(null);
  readonly actionInProgress: Signal<boolean> = computed((): boolean => this.emailSending());

  /**
   * Carga las facturas al entrar por primera vez en la sección.
   */
  ngOnInit(): void {
    void this.clientesService.loadFacturas(this.clientePublicId());
  }

  /**
   * Reintenta la consulta ignorando el resultado cacheado.
   */
  retry(): void {
    if (this.disabled() || this.actionInProgress()) {
      return;
    }

    void this.clientesService.reloadFacturas(this.clientePublicId());
  }

  /**
   * Obtiene el número oficial o la identificación del borrador.
   */
  getFacturaLabel(factura: ClienteFacturaInterface): string {
    return factura.numeroFactura ?? 'Borrador';
  }

  /**
   * Obtiene la etiqueta visible del estado de una factura.
   */
  getEstadoLabel(estado: ClienteFacturaEstado): string {
    return ESTADO_LABELS[estado];
  }

  /**
   * Solicita abrir el detalle de una factura.
   */
  selectFactura(factura: ClienteFacturaInterface): void {
    if (this.disabled() || this.actionInProgress()) {
      return;
    }

    this.emailFacturaSeleccionada.set(null);
    this.clearActionFeedback();
    this.openFacturaEvent.emit(factura);
  }

  /**
   * Permite consultar una factura mediante teclado.
   */
  selectFacturaFromKeyboard(event: KeyboardEvent, factura: ClienteFacturaInterface): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }

    event.preventDefault();
    this.selectFactura(factura);
  }

  /**
   * Solicita crear una factura nueva.
   */
  newFactura(): void {
    if (this.disabled() || this.createDisabled() || this.actionInProgress()) {
      return;
    }

    this.emailFacturaSeleccionada.set(null);
    this.clearActionFeedback();
    this.newFacturaEvent.emit();
  }

  /**
   * Solicita imprimir la factura emitida de su propia
   * fila y cierra cualquier formulario de email abierto.
   */
  printFactura(event: MouseEvent, factura: ClienteFacturaInterface): void {
    event.stopPropagation();

    if (this.disabled() || this.actionInProgress() || !factura.capacidades.puedeImprimir) {
      return;
    }

    this.emailFacturaSeleccionada.set(null);
    this.clearActionFeedback();
    this.printFacturaEvent.emit(factura);
  }

  /**
   * Abre el formulario de envío para la factura
   * correspondiente a la fila pulsada.
   */
  openEmailForm(event: MouseEvent, factura: ClienteFacturaInterface): void {
    event.stopPropagation();

    if (
      this.disabled() ||
      this.actionInProgress() ||
      !this.emailConfigured() ||
      !factura.capacidades.puedeEnviarEmail
    ) {
      return;
    }

    this.clearActionFeedback();
    this.emailFacturaSeleccionada.set(factura);
  }

  /**
   * Cierra el formulario sin enviar la factura.
   */
  cancelEmailForm(): void {
    if (this.actionInProgress()) {
      return;
    }

    this.emailFacturaSeleccionada.set(null);
  }

  /**
   * Envía la factura seleccionada al destinatario
   * introducido exclusivamente para esta operación.
   */
  async sendFacturaEmail(destinatario: string): Promise<void> {
    const factura: ClienteFacturaInterface | null = this.emailFacturaSeleccionada();

    if (
      factura === null ||
      this.disabled() ||
      this.actionInProgress() ||
      !this.emailConfigured() ||
      !factura.capacidades.puedeEnviarEmail
    ) {
      return;
    }

    const normalizedRecipient: string = destinatario.trim();

    if (normalizedRecipient.length === 0) {
      return;
    }

    const command: ClienteFacturaEmailCommand = {
      clientePublicId: this.clientePublicId(),
      facturaPublicId: factura.publicId,
      destinatario: normalizedRecipient,
    };

    this.clearActionFeedback();
    this.emailSending.set(true);
    this.actionProcessingEvent.emit(true);

    try {
      await this.clientesService.emailFactura(command);

      this.emailFacturaSeleccionada.set(null);
      this.actionInfo.set(
        `La factura ${this.getFacturaLabel(factura)} se ha enviado correctamente a ${normalizedRecipient}.`,
      );
    } catch (error: unknown) {
      this.actionError.set(getErrorMessage(error, 'No se ha podido enviar la factura por email.'));
    } finally {
      this.emailSending.set(false);
      this.actionProcessingEvent.emit(false);
    }
  }

  /**
   * Elimina los mensajes producidos por una
   * acción documental anterior.
   */
  private clearActionFeedback(): void {
    this.actionError.set(null);
    this.actionInfo.set(null);
  }
}
