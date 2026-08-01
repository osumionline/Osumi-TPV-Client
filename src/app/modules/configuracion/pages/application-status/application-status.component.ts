import type { Signal } from '@angular/core';
import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import ApplicationStateService from '@services/application-state.service';

@Component({
  selector: 'otpv-application-status',
  templateUrl: './application-status.component.html',
  styleUrl: './application-status.component.scss',
})
export default class ApplicationStatusComponent {
  private readonly applicationStateService: ApplicationStateService =
    inject(ApplicationStateService);
  private readonly router: Router = inject(Router);

  readonly result: Signal<ApplicationStateResult | null> = this.applicationStateService.result;
  readonly loading: Signal<boolean> = this.applicationStateService.loading;
  readonly error: Signal<string | null> = this.applicationStateService.error;

  async retry(): Promise<void> {
    const result: ApplicationStateResult = await this.applicationStateService.refresh();

    if (result.state === 'ready') {
      await this.router.navigateByUrl('/ventas');

      return;
    }

    if (result.state === 'not-installed') {
      await this.router.navigateByUrl('/instalacion');
    }
  }
}
