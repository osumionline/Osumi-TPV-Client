import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import DesktopConfigurationService from '@services/desktop-configuration.service';

export const configuredGuard: CanActivateFn = async () => {
  const configurationService: DesktopConfigurationService = inject(DesktopConfigurationService);
  const router = inject(Router);
  const configured: boolean = await configurationService.isConfigured();

  return configured ? true : router.createUrlTree(['/installation']);
};

export const notConfiguredGuard: CanActivateFn = async () => {
  const configurationService: DesktopConfigurationService = inject(DesktopConfigurationService);
  const router = inject(Router);
  const configured: boolean = await configurationService.isConfigured();

  return configured ? router.createUrlTree(['/']) : true;
};
