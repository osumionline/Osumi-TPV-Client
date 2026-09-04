import { CurrencyPipe, DatePipe } from '@angular/common';
import {
  Component,
  computed,
  inject,
  input,
  output,
  type InputSignal,
  type OnInit,
  type OutputEmitterRef,
  type Signal,
} from '@angular/core';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import type {
  ClienteFacturaEstado,
  ClienteFacturaInterface,
} from '@desktop-contracts/clientes/cliente-factura.interface';
import type ClienteFacturasState from '@model/clientes/cliente-facturas-state.interface';
import CentsToEurosPipe from '@pipes/cents-to-euros.pipe';
import ClientesService from '@services/clientes.service';

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
  readonly openFacturaEvent: OutputEmitterRef<ClienteFacturaInterface> =
    output<ClienteFacturaInterface>();
  readonly newFacturaEvent: OutputEmitterRef<void> = output<void>();
  readonly printFacturaEvent: OutputEmitterRef<ClienteFacturaInterface> =
    output<ClienteFacturaInterface>();
  readonly emailFacturaEvent: OutputEmitterRef<ClienteFacturaInterface> =
    output<ClienteFacturaInterface>();

  readonly state: Signal<ClienteFacturasState> = computed(
    (): ClienteFacturasState =>
      this.clientesService.getFacturasState(this.clientePublicId()),
  );
  readonly facturas: Signal<readonly ClienteFacturaInterface[]> = computed(
    (): readonly ClienteFacturaInterface[] => this.state().data ?? [],
  );

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
    if (this.disabled()) {
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
    if (this.disabled()) {
      return;
    }

    this.openFacturaEvent.emit(factura);
  }

  /**
   * Permite consultar una factura mediante teclado.
   */
  selectFacturaFromKeyboard(
    event: KeyboardEvent,
    factura: ClienteFacturaInterface,
  ): void {
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
    if (this.disabled() || this.createDisabled()) {
      return;
    }

    this.newFacturaEvent.emit();
  }

  /**
   * Solicita imprimir la factura emitida de su propia fila.
   */
  printFactura(event: MouseEvent, factura: ClienteFacturaInterface): void {
    event.stopPropagation();

    if (this.disabled() || !factura.capacidades.puedeImprimir) {
      return;
    }

    this.printFacturaEvent.emit(factura);
  }

  /**
   * Solicita enviar por email la factura emitida de su propia fila.
   */
  emailFactura(event: MouseEvent, factura: ClienteFacturaInterface): void {
    event.stopPropagation();

    if (
      this.disabled() ||
      !this.emailConfigured() ||
      !factura.capacidades.puedeEnviarEmail
    ) {
      return;
    }

    this.emailFacturaEvent.emit(factura);
  }
}