import type { WritableSignal } from '@angular/core';
import { Component, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormField, MatLabel } from '@angular/material/form-field';
import { MatInput } from '@angular/material/input';
import type AutenticarEmpleadoResult from '@desktop-contracts/empleados/autenticar-empleado-result.type';
import type Empleado from '@model/empleados/empleado.model';
import EmpleadosService from '@services/empleados/empleados.service';

/**
 * Solicita la contraseña de un empleado para acceder a Gestión.
 */
@Component({
  selector: 'otpv-management-password-dialog',
  templateUrl: './management-password-dialog.component.html',
  styleUrl: './management-password-dialog.component.scss',
  imports: [
    MatButton,
    MatDialogActions,
    MatDialogClose,
    MatDialogContent,
    MatDialogTitle,
    MatFormField,
    MatInput,
    MatLabel,
    ReactiveFormsModule,
  ],
})
export default class ManagementPasswordDialogComponent {
  private readonly empleadosService: EmpleadosService = inject(EmpleadosService);

  private readonly dialogRef: MatDialogRef<ManagementPasswordDialogComponent, boolean> = inject(
    MatDialogRef<ManagementPasswordDialogComponent, boolean>,
  );

  readonly empleado: Empleado = inject<Empleado>(MAT_DIALOG_DATA);

  readonly passwordControl: FormControl<string> = new FormControl<string>('', {
    nonNullable: true,
  });

  readonly loading: WritableSignal<boolean> = signal<boolean>(false);

  readonly error: WritableSignal<string | null> = signal<string | null>(null);

  readonly authenticationUnavailable: WritableSignal<boolean> = signal<boolean>(false);

  /**
   * Comprueba la contraseña del empleado seleccionado.
   */
  async authenticate(): Promise<void> {
    if (this.loading() || this.authenticationUnavailable()) {
      return;
    }

    if (this.empleado.id === null) {
      this.authenticationUnavailable.set(true);
      this.error.set('Este empleado ya no está disponible.');

      return;
    }

    this.loading.set(true);
    this.error.set(null);

    try {
      const result: AutenticarEmpleadoResult = await this.empleadosService.authenticate(
        this.empleado.id,
        this.passwordControl.value,
      );

      await this.handleAuthenticationResult(result);
    } catch {
      this.error.set('No se ha podido comprobar la contraseña. Inténtalo de nuevo.');
    } finally {
      this.loading.set(false);
    }
  }

  private async handleAuthenticationResult(result: AutenticarEmpleadoResult): Promise<void> {
    switch (result.status) {
      case 'authenticated':
        this.dialogRef.close(true);
        return;

      case 'invalid_password':
        this.passwordControl.setValue('');
        this.error.set('Contraseña incorrecta.');
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
