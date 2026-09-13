import type { Observable } from 'rxjs';

/**
 * Define una pantalla capaz de decidir si puede
 * abandonarse cuando contiene cambios pendientes.
 */
export default interface PendingChangesAware {
  /**
   * Decide si la navegación fuera de la pantalla
   * actualmente editada puede continuar.
   */
  canDeactivate(): boolean | Promise<boolean> | Observable<boolean>;
}
