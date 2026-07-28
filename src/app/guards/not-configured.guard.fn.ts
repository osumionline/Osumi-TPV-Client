import { inject } from '@angular/core';
import { CanActivateFn, Router, UrlTree } from '@angular/router';
import DesktopConfigurationService from '@services/desktop-configuration.service';

const notConfiguredGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const configurationService: DesktopConfigurationService = inject(DesktopConfigurationService);
  const router: Router = inject(Router);

  const configured: boolean = await configurationService.isConfigured();

  if (!configured) {
    return true;
  }

  return router.createUrlTree(['/']);
};

export default notConfiguredGuard;
