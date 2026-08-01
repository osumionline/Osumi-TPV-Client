import { inject } from '@angular/core';
import type { CanActivateFn, UrlTree } from '@angular/router';
import { Router } from '@angular/router';
import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';
import ApplicationStateService from '@services/application-state.service';

const notInstalledGuard: CanActivateFn = async (): Promise<boolean | UrlTree> => {
  const applicationStateService: ApplicationStateService = inject(ApplicationStateService);
  const router: Router = inject(Router);
  const result: ApplicationStateResult = await applicationStateService.load();

  if (result.state === 'not-installed') {
    return true;
  }

  if (result.state === 'ready') {
    return router.parseUrl('/ventas');
  }

  return router.parseUrl('/estado-aplicacion');
};

export default notInstalledGuard;
