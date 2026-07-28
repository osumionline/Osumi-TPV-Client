import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  Signal,
  WritableSignal,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatToolbar } from '@angular/material/toolbar';
import { Router } from '@angular/router';
import type { InstallationCommand } from '@desktop-contracts/configuration/installation-command.interface';
import type {
  InstallationResult,
  InstallationValidationError,
} from '@desktop-contracts/configuration/installation-result.interface';
import createInstallationCommand from '@model/configuracion/installation-command.mapper';
import createInstallationFormInitialValue from '@model/configuracion/installation-form.initial-value';
import { InstallationFormModel } from '@model/configuracion/installation-form.model';
import installationFormSchema from '@model/configuracion/installation-form.schema';
import InstallationStep from '@model/configuracion/installation-step.type';
import { DialogService } from '@osumi/angular-tools';
import DesktopConfigurationService from '@services/desktop-configuration.service';

@Component({
  selector: 'otpv-installation',
  templateUrl: './installation.component.html',
  styleUrl: './installation.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    FormField,
    MatToolbar,
    MatButton,
    MatIcon,
    MatCard,
    MatCardContent,
    MatCardActions,
    MatFormFieldModule,
    MatInput,
    MatRadioModule,
    MatCheckbox,
  ],
})
export default class InstallationComponent {
  private readonly configurationService: DesktopConfigurationService = inject(
    DesktopConfigurationService,
  );
  private readonly dialog: DialogService = inject(DialogService);
  private readonly router: Router = inject(Router);

  private readonly acceptedLogoTypes: readonly string[] = ['image/jpeg', 'image/png'];

  private readonly logoInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('logoInput');

  readonly installationModel: WritableSignal<InstallationFormModel> = signal<InstallationFormModel>(
    createInstallationFormInitialValue(),
  );

  readonly installationForm: FieldTree<InstallationFormModel> = form(
    this.installationModel,
    installationFormSchema,
  );

  readonly paso: WritableSignal<InstallationStep> = signal<InstallationStep>(1);
  readonly logoFileName: WritableSignal<string> = signal<string>('');
  readonly logoMimeType: WritableSignal<string> = signal<string>('');
  readonly logoError: WritableSignal<string> = signal<string>('');
  readonly saving: WritableSignal<boolean> = signal<boolean>(false);

  addLogo(): void {
    this.logoInput().nativeElement.click();
  }

  async onLogoChange(event: Event): Promise<void> {
    const input: HTMLInputElement = event.target as HTMLInputElement;
    const files: FileList | null = input.files;

    if (files === null || files.length === 0) {
      return;
    }

    const file: File = files[0];
    this.logoError.set('');

    if (!this.acceptedLogoTypes.includes(file.type)) {
      this.logoError.set('El logo debe ser una imagen JPG o PNG.');
      input.value = '';
      return;
    }

    try {
      const logoDataUrl: string = await this.readFileAsDataUrl(file);
      this.installationForm.negocio.logoDataUrl().value.set(logoDataUrl);
      this.logoFileName.set(file.name);
      this.logoMimeType.set(file.type);
    } catch (error: unknown) {
      console.error('Error leyendo el archivo de logo:', error);
      this.logoError.set('No se ha podido leer el archivo seleccionado.');
    } finally {
      input.value = '';
    }
  }

  removeLogo(): void {
    this.installationForm.negocio.logoDataUrl().value.set('');
    this.logoFileName.set('');
    this.logoMimeType.set('');
    this.logoError.set('');
  }

  irAPaso(paso: InstallationStep): void {
    const currentStep: InstallationStep = this.paso();
    if (paso > currentStep && !this.validateStep(currentStep)) {
      return;
    }

    this.paso.set(paso);
  }

  selectAllIvas(): void {
    const optionsLength: number = this.installationForm.fiscalidad.ivaOptions.length;

    for (let index: number = 0; index < optionsLength; index++) {
      this.installationForm.fiscalidad.ivaOptions[index].selected().value.set(true);
    }
  }

  selectNoneIvas(): void {
    const optionsLength: number = this.installationForm.fiscalidad.ivaOptions.length;

    for (let index: number = 0; index < optionsLength; index++) {
      this.installationForm.fiscalidad.ivaOptions[index].selected().value.set(false);
    }
  }

  selectAllMargins(): void {
    const optionsLength: number = this.installationForm.fiscalidad.marginOptions.length;

    for (let index: number = 0; index < optionsLength; index++) {
      this.installationForm.fiscalidad.marginOptions[index].selected().value.set(true);
    }
  }

  selectNoneMargins(): void {
    const optionsLength: number = this.installationForm.fiscalidad.marginOptions.length;

    for (let index: number = 0; index < optionsLength; index++) {
      this.installationForm.fiscalidad.marginOptions[index].selected().value.set(false);
    }
  }

  private getValidationMessage(errors: readonly InstallationValidationError[]): string {
    if (errors.length === 0) {
      return 'Los datos de instalación no son válidos.';
    }

    return errors.map((error: InstallationValidationError): string => error.message).join('<br>');
  }

  async saveConfiguration(): Promise<void> {
    this.installationForm().markAsTouched();

    if (this.installationForm().invalid()) {
      this.goToFirstInvalidStep();

      return;
    }

    const command: InstallationCommand = createInstallationCommand(
      this.installationModel(),
      this.logoFileName(),
      this.logoMimeType(),
    );

    this.saving.set(true);

    try {
      const result: InstallationResult = await this.configurationService.install(command);

      if (result.status === 'error') {
        const validationMessage: string = this.getValidationMessage(result.validationErrors);

        this.dialog.alert({
          title: 'Error',
          content: validationMessage,
        });

        return;
      }

      this.clearSensitiveData();

      const navigated: boolean = await this.router.navigateByUrl('/', {
        replaceUrl: true,
      });

      if (!navigated) {
        this.dialog.alert({
          title: 'Información',
          content: 'La instalación ha terminado, pero no se ha podido abrir la pantalla principal.',
        });
      }
    } catch (error: unknown) {
      console.error('Error comunicando con el backend:', error);

      this.dialog.alert({
        title: 'Error',
        content: 'No se ha podido comunicar con el backend de la aplicación.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  private validateStep(step: InstallationStep): boolean {
    switch (step) {
      case 1: {
        this.installationForm.negocio().markAsTouched();
        this.installationForm.empleado().markAsTouched();
        this.installationForm.redes().markAsTouched();
        this.installationForm.valoresIniciales().markAsTouched();
        return !this.isStepOneInvalid();
      }
      case 2: {
        this.installationForm.fiscalidad().markAsTouched();
        return !this.installationForm.fiscalidad().invalid();
      }
      case 3: {
        this.installationForm.ventaOnline().markAsTouched();
        this.installationForm.opciones().markAsTouched();
        return !this.isStepThreeInvalid();
      }
      default:
        return false;
    }
  }

  private isStepOneInvalid(): boolean {
    return (
      this.installationForm.negocio().invalid() ||
      this.installationForm.empleado().invalid() ||
      this.installationForm.redes().invalid() ||
      this.installationForm.valoresIniciales().invalid()
    );
  }

  private isStepThreeInvalid(): boolean {
    return (
      this.installationForm.ventaOnline().invalid() || this.installationForm.opciones().invalid()
    );
  }

  private goToFirstInvalidStep(): void {
    if (this.isStepOneInvalid()) {
      this.paso.set(1);
      return;
    }

    if (this.installationForm.fiscalidad().invalid()) {
      this.paso.set(2);
      return;
    }

    this.paso.set(3);
  }

  private readFileAsDataUrl(file: File): Promise<string> {
    return new Promise<string>(
      (resolve: (value: string) => void, reject: (reason?: unknown) => void): void => {
        const reader: FileReader = new FileReader();

        reader.onload = (): void => {
          if (typeof reader.result !== 'string') {
            reject(new Error('El resultado de FileReader no es una cadena.'));
            return;
          }

          resolve(reader.result);
        };

        reader.onerror = (): void => {
          reject(reader.error ?? new Error('Error desconocido leyendo el logo.'));
        };

        reader.readAsDataURL(file);
      },
    );
  }

  private clearSensitiveData(): void {
    this.installationForm.empleado.password().value.set('');
    this.installationForm.empleado.confirmPassword().value.set('');
    this.installationForm.ventaOnline.secretApi().value.set('');
    this.installationForm.opciones.backupApiKey().value.set('');
    this.installationForm.negocio.logoDataUrl().value.set('');
    this.logoFileName.set('');
    this.logoMimeType.set('');
  }
}
