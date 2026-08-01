import type { WritableSignal } from '@angular/core';
import { Component, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import { MatIcon } from '@angular/material/icon';
import type SetupMode from '@model/configuracion/setup-mode.type';
import LegacyImportComponent from '@modules/configuracion/pages/legacy-import/legacy-import.component';
import NewInstallationComponent from '@modules/configuracion/pages/new-installation/new-installation.component';

@Component({
  selector: 'otpv-installation',
  imports: [LegacyImportComponent, NewInstallationComponent, MatIcon, MatButton],
  templateUrl: './installation.component.html',
  styleUrl: './installation.component.scss',
})
export default class InstallationComponent {
  readonly mode: WritableSignal<SetupMode | null> = signal<SetupMode | null>(null);

  selectNewInstallation(): void {
    this.mode.set('new-installation');
  }

  selectLegacyImport(): void {
    this.mode.set('legacy-import');
  }

  returnToModeSelection(): void {
    this.mode.set(null);
  }
}
