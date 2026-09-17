import {
  afterNextRender,
  Component,
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
import { MatIcon } from '@angular/material/icon';
import type AutenticarEmpleadoResult from '@desktop-contracts/configuration/empleados/autenticar-empleado-result.type';
import type Empleado from '@model/empleados/empleado.model';
import EmpleadosService from '@services/empleados/empleados.service';

/**
 * Solicita la contraseña de un empleado para acceder a Gestión.
 */
@Component({
  selector: 'otpv-management-password-dialog',
  templateUrl: './management-password-dialog.component.html',
  styleUrl: './management-password-dialog.component.scss',
  imports: [MatButton, MatIcon],
})
export default class ManagementPasswordDialogComponent {
  private readonly empleadosService: EmpleadosService = inject(EmpleadosService);

  private readonly passwordInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('passwordInput');

  readonly empleado: InputSignal<Empleado> = input.required<Empleado>();

  readonly authenticatedEvent: OutputEmitterRef<void> = output<void>();

  readonly closeEvent: OutputEmitterRef<void> = output<void>();

  readonly password: WritableSignal<string> = signal<string>('');

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly authenticationUnavailable: WritableSignal<boolean> = signal<boolean>(false);

  constructor() {
    afterNextRender((): void => {
      this.passwordInput().nativeElement.focus();
    });
  }

  /**
   * Actualiza la contraseña introducida.
   */
  updatePassword(event: Event): void {
    const inputElement: HTMLInputElement = event.target as HTMLInputElement;

    this.password.set(inputElement.value);
  }

  /**
   * Comprueba la contraseña del empleado seleccionado.
   */
  async submit(event: Event): Promise<void> {
    event.preventDefault();

    if (this.loading() || this.authenticationUnavailable()) {
      return;
    }

    const empleado: Empleado = this.empleado();

    if (empleado.id === null) {
      this.authenticationUnavailable.set(true);
      this.error.set('Este empleado ya no está disponible.');

      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const result: AutenticarEmpleadoResult = await this.empleadosService.authenticate(
        empleado.id,
        this.password(),
      );

      await this.handleAuthenticationResult(result);
    } catch {
      this.error.set('No se ha podido comprobar la contraseña. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  /**
   * Solicita el cierre del modal.
   */
  close(): void {
    if (!this.loading()) {
      this.closeEvent.emit();
    }
  }

  private async handleAuthenticationResult(result: AutenticarEmpleadoResult): Promise<void> {
    switch (result.status) {
      case 'authenticated':
        this.authenticatedEvent.emit();
        return;

      case 'invalid_password':
        this.password.set('');
        this.error.set('Contraseña incorrecta.');
        this.passwordInput().nativeElement.focus();
        return;

      case 'password_unavailable':
        this.authenticationUnavailable.set(true);
        this.error.set(
          'Este empleado no tiene una contraseña válida. Un administrador debe asignarle una nueva contraseña.',
        );
        return;

      case 'employee_unavailable':
        this.authenticationUnavailable.set(true);
        this.error.set('Este empleado ya no está disponible.');

        try {
          await this.empleadosService.reload();

          this.error.set(
            'Este empleado ya no está disponible. La lista de empleados se ha actualizado.',
          );
        } catch {
          this.error.set(
            'Este empleado ya no está disponible. No se ha podido actualizar la lista de empleados.',
          );
        }

        return;
    }
  }
}
