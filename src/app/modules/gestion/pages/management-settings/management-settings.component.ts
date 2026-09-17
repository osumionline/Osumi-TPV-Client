import { Component, WritableSignal, inject, signal } from '@angular/core';
import { FieldTree, FormField, form } from '@angular/forms/signals';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardActions, MatCardContent } from '@angular/material/card';
import { MatCheckbox } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIcon } from '@angular/material/icon';
import { MatInput } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { RouterLink } from '@angular/router';
import type AppData from '@desktop-contracts/configuration/app-data.interface';
import type ConfigurationUpdateCommand from '@desktop-contracts/configuration/configuration-update-command.interface';
import createSettingsCommand from '@model/configuracion/settings-command.mapper';
import createSettingsFormInitialValue from '@model/configuracion/settings-form.initial-value';
import type { SettingsFormModel } from '@model/configuracion/settings-form.model';
import settingsFormSchema from '@model/configuracion/settings-form.schema';
import { DialogService } from '@osumi/angular-tools';
import AppDataService from '@services/application/app-data.service';

@Component({
  selector: 'otpv-management-settings',
  templateUrl: './management-settings.component.html',
  styleUrl: './management-settings.component.scss',
  imports: [
    FormField,
    RouterLink,
    MatButton,
    MatIcon,
    MatCard,
    MatCardContent,
    MatCardActions,
    MatCheckbox,
    MatFormFieldModule,
    MatInput,
    MatRadioModule,
  ],
})
export default class ManagementSettingsComponent {
  private readonly appDataService: AppDataService = inject(AppDataService);
  private readonly dialog: DialogService = inject(DialogService);

  private readonly initialAppData: AppData = this.requireAppData();

  readonly settingsModel: WritableSignal<SettingsFormModel> = signal<SettingsFormModel>(
    createSettingsFormInitialValue(this.initialAppData),
  );
  readonly saving: WritableSignal<boolean> = signal<boolean>(false);

  readonly settingsForm: FieldTree<SettingsFormModel> = form(
    this.settingsModel,
    settingsFormSchema,
  );

  readonly ticketEmailBusinessVariable: string = '{nombreNegocio}';
  readonly ticketEmailReferenceVariable: string = '{referencia}';

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

    const command: ConfigurationUpdateCommand = createSettingsCommand(this.settingsModel());

    this.saving.set(true);

    try {
      await this.appDataService.update(command);

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

  private requireAppData(): AppData {
    const appData: AppData | null = this.appDataService.appData();

    if (appData === null) {
      throw new Error('No existe configuración cargada para mostrar los ajustes.');
    }

    return appData;
  }
}
