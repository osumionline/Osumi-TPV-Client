import type { CanDeactivateFn } from '@angular/router';
import type PendingChangesAware from '@model/navigation/pending-changes-aware.interface';

/**
 * Delega en la pantalla activa la decisión sobre
 * una navegación con posibles cambios pendientes.
 */
const pendingChangesGuard: CanDeactivateFn<PendingChangesAware> = (
  component: PendingChangesAware,
): ReturnType<PendingChangesAware['canDeactivate']> => component.canDeactivate();

export default pendingChangesGuard;
