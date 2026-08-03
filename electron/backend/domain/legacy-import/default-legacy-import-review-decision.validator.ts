import type LegacyImportReviewDecisionValidator from '@backend/contracts/legacy-import-review-decision-validator.interface';
import type {
  LegacyImportArticleReference,
  LegacyImportReviewConflict,
} from '@desktop-contracts/legacy-import/legacy-import-review-conflict.type';
import type { LegacyImportReviewDecision } from '@desktop-contracts/legacy-import/legacy-import-review-decision.type';

export default class DefaultLegacyImportReviewDecisionValidator implements LegacyImportReviewDecisionValidator {
  validate(
    conflicts: readonly LegacyImportReviewConflict[],
    decisions: readonly LegacyImportReviewDecision[],
  ): readonly LegacyImportReviewDecision[] {
    const conflictsById: Map<string, LegacyImportReviewConflict> =
      this.createConflictMap(conflicts);

    const decisionsById: Map<string, LegacyImportReviewDecision> =
      this.createDecisionMap(decisions);

    for (const decision of decisions) {
      if (!conflictsById.has(decision.conflictId)) {
        throw new Error(
          [
            'Se ha recibido una decisión',
            'para un conflicto inexistente:',
            decision.conflictId,
          ].join(' '),
        );
      }
    }

    const normalizedDecisions: LegacyImportReviewDecision[] = [];

    for (const conflict of conflicts) {
      const decision: LegacyImportReviewDecision | undefined = decisionsById.get(conflict.id);

      if (decision === undefined) {
        throw new Error(`Falta una decisión para el conflicto ${conflict.id}.`);
      }

      if (decision.code !== conflict.code) {
        throw new Error(
          [`La decisión del conflicto ${conflict.id}`, 'no corresponde con su tipo.'].join(' '),
        );
      }

      this.validateDecision(conflict, decision);

      normalizedDecisions.push(decision);
    }

    return normalizedDecisions;
  }

  private createConflictMap(
    conflicts: readonly LegacyImportReviewConflict[],
  ): Map<string, LegacyImportReviewConflict> {
    const result: Map<string, LegacyImportReviewConflict> = new Map<
      string,
      LegacyImportReviewConflict
    >();

    for (const conflict of conflicts) {
      if (result.has(conflict.id)) {
        throw new Error(`El análisis contiene el conflicto duplicado ${conflict.id}.`);
      }

      result.set(conflict.id, conflict);
    }

    return result;
  }

  private createDecisionMap(
    decisions: readonly LegacyImportReviewDecision[],
  ): Map<string, LegacyImportReviewDecision> {
    const result: Map<string, LegacyImportReviewDecision> = new Map<
      string,
      LegacyImportReviewDecision
    >();

    for (const decision of decisions) {
      if (result.has(decision.conflictId)) {
        throw new Error(
          ['Se ha recibido más de una decisión', `para el conflicto ${decision.conflictId}.`].join(
            ' ',
          ),
        );
      }

      result.set(decision.conflictId, decision);
    }

    return result;
  }

  private validateDecision(
    conflict: LegacyImportReviewConflict,
    decision: LegacyImportReviewDecision,
  ): void {
    switch (conflict.code) {
      case 'duplicate-active-article-locators':
        if (decision.code !== 'duplicate-active-article-locators') {
          throw new Error(`Decisión no válida para ${conflict.id}.`);
        }

        this.assertArticleBelongsToConflict(conflict.articles, decision.articleId, conflict.id);

        return;

      case 'duplicate-active-direct-access-codes':
        if (decision.code !== 'duplicate-active-direct-access-codes') {
          throw new Error(`Decisión no válida para ${conflict.id}.`);
        }

        if (decision.articleId === null) {
          return;
        }

        this.assertArticleBelongsToConflict(conflict.articles, decision.articleId, conflict.id);

        return;

      case 'active-article-barcode-conflicts':
        if (decision.code !== 'active-article-barcode-conflicts') {
          throw new Error(`Decisión no válida para ${conflict.id}.`);
        }

        if (decision.articleId === null) {
          return;
        }

        this.assertArticleBelongsToConflict(conflict.articles, decision.articleId, conflict.id);

        return;

      case 'direct-access-locator-collisions':
        if (decision.code !== 'direct-access-locator-collisions') {
          throw new Error(`Decisión no válida para ${conflict.id}.`);
        }

        if (
          decision.action !== 'clear-direct-access' &&
          decision.action !== 'reassign-direct-access'
        ) {
          throw new Error(`Acción no válida para el conflicto ${conflict.id}.`);
        }

        return;

      case 'anomalous-sale-delivered-amounts':
        if (decision.code !== 'anomalous-sale-delivered-amounts') {
          throw new Error(`Decisión no válida para ${conflict.id}.`);
        }

        if (decision.action !== 'use-sale-total' && decision.action !== 'use-zero') {
          throw new Error(`Acción no válida para el conflicto ${conflict.id}.`);
        }

        return;
    }
  }

  private assertArticleBelongsToConflict(
    articles: readonly LegacyImportArticleReference[],
    articleId: number,
    conflictId: string,
  ): void {
    if (!Number.isSafeInteger(articleId) || articleId <= 0) {
      throw new Error(`El artículo elegido para ${conflictId} no es válido.`);
    }

    const belongsToConflict: boolean = articles.some(
      (article: LegacyImportArticleReference): boolean => article.articleId === articleId,
    );

    if (!belongsToConflict) {
      throw new Error(
        [`El artículo ${articleId}`, `no pertenece al conflicto ${conflictId}.`].join(' '),
      );
    }
  }
}
