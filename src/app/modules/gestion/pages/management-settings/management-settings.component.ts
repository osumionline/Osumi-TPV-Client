import {
  Component,
  ElementRef,
  inject,
  signal,
  viewChild,
  type Signal,
  type WritableSignal,
} from '@angular/core';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { MatButton, MatIconButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltip } from '@angular/material/tooltip';
import { RouterLink } from '@angular/router';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import type RevealableConfigurationSecret from '@desktop-contracts/configuration/revealable-configuration-secret.type';
import createSettingsCommand from '@model/configuracion/settings-command.mapper';
import createSettingsFormInitialValue from '@model/configuracion/settings-form.initial-value';
import type { SettingsFormModel } from '@model/configuracion/settings-form.model';
import settingsFormSchema from '@model/configuracion/settings-form.schema';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/application/app-data.service';
import DesktopConfigurationService from '@services/application/desktop-configuration.service';
import { firstValueFrom } from 'rxjs';

type SensitiveSettingsField = RevealableConfigurationSecret | 'emailSmtpPassword';

@Component({
  selector: 'otpv-management-settings',
  templateUrl: './management-settings.component.html',
  styleUrl: './management-settings.component.scss',
  imports: [
    FormField,
    RouterLink,
    MatButton,
    MatIcon,
    MatIconButton,
    MatCard,
    MatCardContent,
    MatCardActions,
    MatCheckbox,
    MatFormFieldModule,
    MatInput,
    MatRadioModule,
    MatSelectModule,
    MatTooltip,
  ],
})
export default class ManagementSettingsComponent {
  private readonly appDataService: AppDataService = inject(AppDataService);

  private readonly desktopConfigurationService: DesktopConfigurationService = inject(
    DesktopConfigurationService,
  );

  private readonly dialog: DialogService = inject(DialogService);

  private readonly acceptedLogoTypes: readonly string[] = ['image/jpeg', 'image/png', 'image/webp'];

  private readonly logoInput: Signal<ElementRef<HTMLInputElement>> =
    viewChild.required<ElementRef<HTMLInputElement>>('logoInput');

  private readonly initialAppData: AppData = this.requireAppData();

  readonly settingsModel: WritableSignal<SettingsFormModel> = signal<SettingsFormModel>(
    createSettingsFormInitialValue(this.initialAppData),
  );

  readonly settingsForm: FieldTree<SettingsFormModel> = form(
    this.settingsModel,
    settingsFormSchema,
  );

  readonly saving: WritableSignal<boolean> = signal<boolean>(false);

  readonly logoPreviewUrl: WritableSignal<string> = signal<string>('osumi://assets/logo');

  readonly logoDataUrl: WritableSignal<string> = signal<string>('');

  readonly logoFileName: WritableSignal<string> = signal<string>('');

  readonly logoMimeType: WritableSignal<string> = signal<string>('');

  readonly logoError: WritableSignal<string> = signal<string>('');

  readonly secretApiVisible: WritableSignal<boolean> = signal<boolean>(false);

  readonly backupApiKeyVisible: WritableSignal<boolean> = signal<boolean>(false);

  readonly ticketBaiTokenVisible: WritableSignal<boolean> = signal<boolean>(false);

  readonly emailSmtpPasswordVisible: WritableSignal<boolean> = signal<boolean>(false);

  readonly secretApiRevealed: WritableSignal<boolean> = signal<boolean>(false);

  readonly backupApiKeyRevealed: WritableSignal<boolean> = signal<boolean>(false);

  readonly ticketBaiTokenRevealed: WritableSignal<boolean> = signal<boolean>(false);

  readonly revealingSecret: WritableSignal<RevealableConfigurationSecret | null> =
    signal<RevealableConfigurationSecret | null>(null);

  readonly ticketEmailBusinessVariable: string = '{nombreNegocio}';

  readonly ticketEmailReferenceVariable: string = '{referencia}';

  /**
   * Abre el selector de archivo para sustituir
   * el logo actual del negocio.
   */
  addLogo(): void {
    this.logoInput().nativeElement.click();
  }

  /**
   * Procesa el nuevo logo seleccionado y prepara
   * su previsualización antes de guardarlo.
   */
  async onLogoChange(event: Event): Promise<void> {
    const input: HTMLInputElement = event.target as HTMLInputElement;

    const files: FileList | null = input.files;

    if (files === null || files.length === 0) {
      return;
    }

    const file: File = files[0];

    this.logoError.set('');

    if (!this.acceptedLogoTypes.includes(file.type)) {
      this.logoError.set('El logo debe ser una imagen JPG, PNG o WebP.');

      input.value = '';

      return;
    }

    try {
      const dataUrl: string = await this.readFileAsDataUrl(file);

      this.logoDataUrl.set(dataUrl);
      this.logoFileName.set(file.name);
      this.logoMimeType.set(file.type);
      this.logoPreviewUrl.set(dataUrl);
    } catch (error: unknown) {
      console.error('Error leyendo el nuevo logo:', error);

      this.logoError.set('No se ha podido leer el archivo seleccionado.');
    } finally {
      input.value = '';
    }
  }

  /**
   * Descarta el nuevo logo seleccionado y vuelve
   * a mostrar el logo actualmente almacenado.
   */
  cancelLogoChange(): void {
    this.logoDataUrl.set('');
    this.logoFileName.set('');
    this.logoMimeType.set('');
    this.logoError.set('');
    this.logoPreviewUrl.set(this.createCurrentLogoUrl());
  }

  /**
   * Alterna entre mostrar y ocultar el contenido
   * de un campo sensible.
   */
  toggleSensitiveVisibility(field: SensitiveSettingsField): void {
    switch (field) {
      case 'secretApi':
        this.secretApiVisible.update((visible: boolean): boolean => !visible);
        break;

      case 'backupApiKey':
        this.backupApiKeyVisible.update((visible: boolean): boolean => !visible);
        break;

      case 'ticketBaiToken':
        this.ticketBaiTokenVisible.update((visible: boolean): boolean => !visible);
        break;

      case 'emailSmtpPassword':
        this.emailSmtpPasswordVisible.update((visible: boolean): boolean => !visible);
        break;
    }
  }

  /**
   * Solicita confirmación y carga en el formulario
   * uno de los secretos revelables almacenados.
   */
  async revealSecret(secret: RevealableConfigurationSecret): Promise<void> {
    if (this.revealingSecret() !== null) {
      return;
    }

    const label: string = this.getSecretLabel(secret);

    const confirmed: boolean = await firstValueFrom(
      this.dialog.confirm({
        title: `Mostrar ${label}`,
        content: [
          `Vas a cargar en pantalla el valor almacenado de ${label}.`,
          'Asegúrate de que nadie pueda verlo.',
        ].join(' '),
        warn: true,
        ok: 'Mostrar',
        cancel: 'Cancelar',
      }),
    );

    if (confirmed !== true) {
      return;
    }

    this.revealingSecret.set(secret);

    try {
      const value: string | null = await this.desktopConfigurationService.revealSecret(secret);

      this.markSecretAsRevealed(secret);

      if (value === null) {
        this.dialog.alert({
          title: 'Información',
          content: `No hay ningún valor almacenado para ${label}.`,
        });

        return;
      }

      this.setSecretValue(secret, value);
    } catch (error: unknown) {
      console.error('Error revelando secreto:', error);

      this.dialog.alert({
        title: 'Error',
        content: `No se ha podido obtener ${label}.`,
      });
    } finally {
      this.revealingSecret.set(null);
    }
  }

  /**
   * Marca todos los tipos de IVA disponibles.
   */
  selectAllIvas(): void {
    for (const option of this.settingsForm.fiscalidad.ivaOptions) {
      option.selected().value.set(true);
    }
  }

  /**
   * Desmarca todos los tipos de IVA disponibles.
   */
  selectNoneIvas(): void {
    for (const option of this.settingsForm.fiscalidad.ivaOptions) {
      option.selected().value.set(false);
    }
  }

  /**
   * Marca todos los márgenes de beneficio disponibles.
   */
  selectAllMargins(): void {
    for (const option of this.settingsForm.fiscalidad.marginOptions) {
      option.selected().value.set(true);
    }
  }

  /**
   * Desmarca todos los márgenes de beneficio disponibles.
   */
  selectNoneMargins(): void {
    for (const option of this.settingsForm.fiscalidad.marginOptions) {
      option.selected().value.set(false);
    }
  }

  /**
   * Valida y persiste los ajustes generales de la aplicación.
   */
  async save(): Promise<void> {
    this.settingsForm().markAsTouched();

    if (this.settingsForm().invalid()) {
      return;
    }

    const command: ConfigurationUpdateCommand = this.createUpdateCommand();

    const logoChanged: boolean = this.logoDataUrl() !== '';

    this.saving.set(true);

    try {
      await this.appDataService.update(command);

      this.clearSensitiveFields();

      if (logoChanged) {
        this.clearLogoSelection();
      }

      this.dialog.alert({
        title: 'Información',
        content: 'Los ajustes se han guardado correctamente.',
      });
    } catch (error: unknown) {
      console.error('Error guardando los ajustes:', error);

      this.dialog.alert({
        title: 'Error',
        content: 'No se han podido guardar los ajustes.',
      });
    } finally {
      this.saving.set(false);
    }
  }

  private createUpdateCommand(): ConfigurationUpdateCommand {
    const command: ConfigurationUpdateCommand = createSettingsCommand(this.settingsModel());

    if (this.logoDataUrl() === '') {
      return command;
    }

    return {
      ...command,

      logo: {
        fileName: this.logoFileName(),
        mimeType: this.logoMimeType(),
        dataUrl: this.logoDataUrl(),
      },
    };
  }

  private setSecretValue(secret: RevealableConfigurationSecret, value: string): void {
    switch (secret) {
      case 'secretApi':
        this.settingsForm.ventaOnline.secretApi().value.set(value);
        break;

      case 'backupApiKey':
        this.settingsForm.backup.backupApiKey().value.set(value);
        break;

      case 'ticketBaiToken':
        this.settingsForm.ticketBai.token().value.set(value);
        break;
    }
  }

  private markSecretAsRevealed(secret: RevealableConfigurationSecret): void {
    switch (secret) {
      case 'secretApi':
        this.secretApiRevealed.set(true);
        break;

      case 'backupApiKey':
        this.backupApiKeyRevealed.set(true);
        break;

      case 'ticketBaiToken':
        this.ticketBaiTokenRevealed.set(true);
        break;
    }
  }

  private getSecretLabel(secret: RevealableConfigurationSecret): string {
    switch (secret) {
      case 'secretApi':
        return 'el secreto de la API';

      case 'backupApiKey':
        return 'la clave de TPV Backup';

      case 'ticketBaiToken':
        return 'el token de TicketBAI';
    }
  }

  private clearSensitiveFields(): void {
    this.settingsForm.ventaOnline.secretApi().value.set('');

    this.settingsForm.backup.backupApiKey().value.set('');

    this.settingsForm.emailSmtp.password().value.set('');

    this.settingsForm.ticketBai.token().value.set('');

    this.secretApiVisible.set(false);
    this.backupApiKeyVisible.set(false);
    this.emailSmtpPasswordVisible.set(false);
    this.ticketBaiTokenVisible.set(false);

    this.secretApiRevealed.set(false);
    this.backupApiKeyRevealed.set(false);
    this.ticketBaiTokenRevealed.set(false);
  }

  private clearLogoSelection(): void {
    this.logoDataUrl.set('');
    this.logoFileName.set('');
    this.logoMimeType.set('');
    this.logoError.set('');

    this.logoPreviewUrl.set(this.createCurrentLogoUrl());
  }

  private createCurrentLogoUrl(): string {
    return 'osumi://assets/logo?v=' + Date.now().toString();
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

  private requireAppData(): AppData {
    const appData: AppData | null = this.appDataService.appData();

    if (appData === null) {
      throw new Error('No existe configuración cargada para mostrar los ajustes.');
    }

    return appData;
  }
}
