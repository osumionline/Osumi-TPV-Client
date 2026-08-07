import { inject } from '@angular/core';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import ApplicationStartupService from '@services/application-startup.service';
import ApplicationStateService from '@services/application-state.service';

const readyApplicationGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const applicationStateService: ApplicationStateService = inject(ApplicationStateService);
  const applicationStartupService: ApplicationStartupService = inject(ApplicationStartupService);
  const router: Router = inject(Router);

  const result: ApplicationStateResult = await applicationStateService.load();

  if (result.state === 'not-installed') {
    return router.parseUrl('/instalacion');
  }

  if (result.state === 'incomplete' || result.state === 'invalid') {
    return router.parseUrl('/estado-aplicacion');
  }

  if (!applicationStartupService.isReady()) {
    return router.parseUrl('/startup');
  }

  return true;
};

export default readyApplicationGuard;
