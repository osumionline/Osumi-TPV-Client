import type { Signal, WritableSignal } from '@angular/core';
import { computed, Service, signal } from '@angular/core';

interface GestionSessionState {
  readonly empleadoId: number;
  readonly authenticatedAt: number;
  readonly expiresAt: number;
}

const GESTION_SESSION_DURATION_MS: number = 10 * 60 * 1000;

@Service()
export default class GestionSessionService {
  private readonly sessionSignal: WritableSignal<GestionSessionState | null> =
    signal<GestionSessionState | null>(null);

  readonly empleadoId: Signal<number | null> = computed(
    (): number | null => this.sessionSignal()?.empleadoId ?? null,
  );

  readonly authenticatedAt: Signal<number | null> = computed(
    (): number | null => this.sessionSignal()?.authenticatedAt ?? null,
  );

  readonly expiresAt: Signal<number | null> = computed(
    (): number | null => this.sessionSignal()?.expiresAt ?? null,
  );

  /**
   * Inicia una nueva sesión temporal de Gestión.
   */
  login(empleadoId: number): void {
    const authenticatedAt: number = Date.now();

    this.sessionSignal.set({
      empleadoId,
      authenticatedAt,
      expiresAt: authenticatedAt + GESTION_SESSION_DURATION_MS,
    });
  }

  /**
   * Finaliza la sesión actual de Gestión.
   */
  logout(): void {
    this.sessionSignal.set(null);
  }

  /**
   * Indica si la sesión de Gestión sigue vigente en el instante de la consulta.
   */
  isActive(): boolean {
    const session: GestionSessionState | null = this.sessionSignal();

    return session !== null && Date.now() < session.expiresAt;
  }
}
