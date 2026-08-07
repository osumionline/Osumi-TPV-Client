import type { OnInit } from '@angular/core';
import { Component, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import ApplicationStartupService from '@services/application-startup.service';

@Component({
  selector: 'otpv-startup',
  imports: [MatButtonModule, MatProgressBarModule, MatProgressSpinnerModule],
  templateUrl: './startup.component.html',
  styleUrl: './startup.component.scss',
})
export default class StartupComponent implements OnInit {
  readonly startupService: ApplicationStartupService = inject(ApplicationStartupService);
  private readonly router: Router = inject(Router);

  ngOnInit(): void {
    void this.start();
  }

  retry(): void {
    void this.start();
  }

  private async start(): Promise<void> {
    try {
      await this.startupService.start();

      await this.router.navigate(['/ventas'], {
        replaceUrl: true,
      });
    } catch {
      /*
       * ApplicationStartupService conserva el error.
       * El template permanece en esta ruta para
       * mostrarlo y permitir reintentar.
       */
    }
  }
}
