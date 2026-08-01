import { computed, Injectable, signal } from '@angular/core';

import type { Signal, WritableSignal } from '@angular/core';

import type ApplicationStateResult from '@desktop-contracts/application/application-state-result.interface';

import type { ApplicationState } from '@desktop-contracts/application/application-state.type';

@Injectable({
  providedIn: 'root',
})
export default class ApplicationStateService {
  private readonly resultSignal: WritableSignal<ApplicationStateResult | null> =
    signal<ApplicationStateResult | null>(null);

  private readonly loadingSignal: WritableSignal<boolean> = signal<boolean>(false);

  private readonly errorSignal: WritableSignal<string | null> = signal<string | null>(null);

  private pendingRequest: Promise<ApplicationStateResult> | null = null;

  readonly result: Signal<ApplicationStateResult | null> = this.resultSignal.asReadonly();

  readonly loading: Signal<boolean> = this.loadingSignal.asReadonly();

  readonly error: Signal<string | null> = this.errorSignal.asReadonly();

  readonly state: Signal<ApplicationState | null> = computed(
    (): ApplicationState | null => this.resultSignal()?.state ?? null,
  );

  readonly loaded: Signal<boolean> = computed((): boolean => this.resultSignal() !== null);

  readonly isReady: Signal<boolean> = computed(
    (): boolean => this.resultSignal()?.state === 'ready',
  );

  readonly isNotInstalled: Signal<boolean> = computed(
    (): boolean => this.resultSignal()?.state === 'not-installed',
  );

  readonly isIncomplete: Signal<boolean> = computed(
    (): boolean => this.resultSignal()?.state === 'incomplete',
  );

  readonly isInvalid: Signal<boolean> = computed(
    (): boolean => this.resultSignal()?.state === 'invalid',
  );

  load(): Promise<ApplicationStateResult> {
    const currentResult: ApplicationStateResult | null = this.resultSignal();

    if (currentResult !== null) {
      return Promise.resolve(currentResult);
    }

    return this.refresh();
  }

  refresh(): Promise<ApplicationStateResult> {
    if (this.pendingRequest !== null) {
      return this.pendingRequest;
    }

    this.pendingRequest = this.requestState();

    return this.pendingRequest;
  }

  clear(): void {
    this.resultSignal.set(null);

    this.errorSignal.set(null);
  }

  private async requestState(): Promise<ApplicationStateResult> {
    this.loadingSignal.set(true);

    this.errorSignal.set(null);

    try {
      const result: ApplicationStateResult = await window.osumiDesktop.application.getState();

      this.resultSignal.set(result);

      return result;
    } catch (error: unknown) {
      const message: string = error instanceof Error ? error.message : String(error);

      this.errorSignal.set(message);

      throw new Error('No se ha podido obtener el estado de la aplicación.', {
        cause: error,
      });
    } finally {
      this.loadingSignal.set(false);

      this.pendingRequest = null;
    }
  }
}
