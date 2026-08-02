import type { Signal, WritableSignal } from '@angular/core';
import { Component, computed, input, output, signal } from '@angular/core';
import { MatButton } from '@angular/material/button';
import {
  MatCard,
  MatCardContent,
  MatCardHeader,
  MatCardSubtitle,
  MatCardTitle,
} from '@angular/material/card';
import { MatIcon } from '@angular/material/icon';
import { MatRadioButton, MatRadioGroup } from '@angular/material/radio';
import type { LegacyImportReviewConflict } from '@desktop-contracts/legacy-import/legacy-import-review-conflict.type';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';

@Component({
  selector: 'otpv-legacy-import-conflict-resolution',
  imports: [
    MatButton,
    MatCard,
    MatCardContent,
    MatCardHeader,
    MatCardSubtitle,
    MatCardTitle,
    MatIcon,
    MatRadioButton,
    MatRadioGroup,
  ],
  templateUrl: './legacy-import-conflict-resolution.component.html',
  styleUrl: './legacy-import-conflict-resolution.component.scss',
})
export default class LegacyImportConflictResolutionComponent {
  readonly conflicts = input.required<readonly LegacyImportReviewConflict[]>();

  readonly completed = output<readonly LegacyImportReviewDecision[]>();

  readonly cancelled = output<void>();

  private readonly decisions: WritableSignal<Readonly<Record<string, LegacyImportReviewDecision>>> =
    signal<Readonly<Record<string, LegacyImportReviewDecision>>>({});

  private readonly currencyFormatter: Intl.NumberFormat = new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR',
  });

  readonly allResolved: Signal<boolean> = computed((): boolean => {
    const currentDecisions: Readonly<Record<string, LegacyImportReviewDecision>> = this.decisions();

    const currentConflicts: readonly LegacyImportReviewConflict[] = this.conflicts();

    return (
      currentConflicts.length > 0 &&
      currentConflicts.every((conflict: LegacyImportReviewConflict): boolean =>
        this.isDecisionValid(conflict, currentDecisions[conflict.id]),
      )
    );
  });

  selectedArticleId(conflictId: string): number | null | undefined {
    const decision: LegacyImportReviewDecision | undefined = this.decisions()[conflictId];

    if (decision === undefined || !('articleId' in decision)) {
      return undefined;
    }

    return decision.articleId;
  }

  selectedAccessLocatorAction(
    conflictId: string,
  ): 'clear-direct-access' | 'reassign-direct-access' | undefined {
    const decision: LegacyImportReviewDecision | undefined = this.decisions()[conflictId];

    if (decision?.code !== 'direct-access-locator-collisions') {
      return undefined;
    }

    return decision.action;
  }

  selectedSaleAction(conflictId: string): 'use-sale-total' | 'use-zero' | undefined {
    const decision: LegacyImportReviewDecision | undefined = this.decisions()[conflictId];

    if (decision?.code !== 'anomalous-sale-delivered-amounts') {
      return undefined;
    }

    return decision.action;
  }

  setLocatorOwner(
    conflictId: string,

    articleId: number,
  ): void {
    this.setDecision({
      conflictId,

      code: 'duplicate-active-article-locators',

      articleId,
    });
  }

  setDirectAccessOwner(
    conflictId: string,

    articleId: number | null,
  ): void {
    this.setDecision({
      conflictId,

      code: 'duplicate-active-direct-access-codes',

      articleId,
    });
  }

  setBarcodeOwner(
    conflictId: string,

    articleId: number | null,
  ): void {
    this.setDecision({
      conflictId,

      code: 'active-article-barcode-conflicts',

      articleId,
    });
  }

  setAccessLocatorAction(
    conflictId: string,

    action: 'clear-direct-access' | 'reassign-direct-access',
  ): void {
    this.setDecision({
      conflictId,

      code: 'direct-access-locator-collisions',

      action,
    });
  }

  setSaleAction(
    conflictId: string,

    action: 'use-sale-total' | 'use-zero',
  ): void {
    this.setDecision({
      conflictId,

      code: 'anomalous-sale-delivered-amounts',

      action,
    });
  }

  formatCurrency(value: number): string {
    return this.currencyFormatter.format(value);
  }

  cancel(): void {
    this.cancelled.emit();
  }

  submit(): void {
    if (!this.allResolved()) {
      return;
    }

    const currentDecisions: Readonly<Record<string, LegacyImportReviewDecision>> = this.decisions();

    const result: LegacyImportReviewDecision[] = [];

    for (const conflict of this.conflicts()) {
      const decision: LegacyImportReviewDecision | undefined = currentDecisions[conflict.id];

      if (decision === undefined) {
        return;
      }

      result.push(decision);
    }

    this.completed.emit(result);
  }

  private setDecision(decision: LegacyImportReviewDecision): void {
    this.decisions.update(
      (
        currentDecisions: Readonly<Record<string, LegacyImportReviewDecision>>,
      ): Readonly<Record<string, LegacyImportReviewDecision>> => ({
        ...currentDecisions,

        [decision.conflictId]: decision,
      }),
    );
  }

  private isDecisionValid(
    conflict: LegacyImportReviewConflict,

    decision: LegacyImportReviewDecision | undefined,
  ): boolean {
    if (
      decision === undefined ||
      decision.conflictId !== conflict.id ||
      decision.code !== conflict.code
    ) {
      return false;
    }

    switch (conflict.code) {
      case 'duplicate-active-article-locators':
        return (
          decision.code === 'duplicate-active-article-locators' &&
          conflict.articles.some((article): boolean => article.articleId === decision.articleId)
        );

      case 'duplicate-active-direct-access-codes':
        return (
          decision.code === 'duplicate-active-direct-access-codes' &&
          (decision.articleId === null ||
            conflict.articles.some((article): boolean => article.articleId === decision.articleId))
        );

      case 'active-article-barcode-conflicts':
        return (
          decision.code === 'active-article-barcode-conflicts' &&
          (decision.articleId === null ||
            conflict.articles.some((article): boolean => article.articleId === decision.articleId))
        );

      case 'direct-access-locator-collisions':
        return (
          decision.code === 'direct-access-locator-collisions' &&
          (decision.action === 'clear-direct-access' ||
            decision.action === 'reassign-direct-access')
        );

      case 'anomalous-sale-delivered-amounts':
        return (
          decision.code === 'anomalous-sale-delivered-amounts' &&
          (decision.action === 'use-sale-total' || decision.action === 'use-zero')
        );
    }
  }

  getConflictTitle(conflict: LegacyImportReviewConflict): string {
    switch (conflict.code) {
      case 'duplicate-active-article-locators':
        return ['Localizador', conflict.value, 'duplicado'].join(' ');

      case 'duplicate-active-direct-access-codes':
        return ['Acceso directo', conflict.value, 'duplicado'].join(' ');

      case 'direct-access-locator-collisions':
        return ['Colisión con el valor', conflict.value].join(' ');

      case 'active-article-barcode-conflicts':
        return ['Código de barras', conflict.barcode].join(' ');

      case 'anomalous-sale-delivered-amounts':
        return ['Venta', conflict.saleNumber].join(' ');
    }
  }

  getConflictSubtitle(conflict: LegacyImportReviewConflict): string {
    switch (conflict.code) {
      case 'duplicate-active-article-locators':
        return 'Elige qué artículo conserva el localizador.';

      case 'duplicate-active-direct-access-codes':
        return 'Elige qué artículo conserva el acceso directo.';

      case 'direct-access-locator-collisions':
        return 'Coinciden un localizador y un acceso directo.';

      case 'active-article-barcode-conflicts':
        return 'Está asignado a varios artículos activos.';

      case 'anomalous-sale-delivered-amounts':
        return 'El importe entregado tiene un valor anómalo.';
    }
  }
}
