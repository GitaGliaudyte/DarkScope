import { Confidence, RuleResult } from '../../engine/types';

type Impact = RuleResult['impact'];

export type MissingControlsClassification = 'BOTH_PRESENT' | 'SORT_ONLY' | 'FILTER_ONLY' | 'BOTH_MISSING';

export interface ScoreSummary {
  rawScore: number;
  classification: MissingControlsClassification;
  productCount: number;
  hasPagination: boolean;
  missingSort: boolean;
  missingFilter: boolean;
}

/**
 * Computes the capped raw score for missing sorting and filtering functionality on a product listing page.
 */
export function computeScore(
  classification: MissingControlsClassification,
  productCount: number,
  hasPagination: boolean
): ScoreSummary {
  let rawScore = 0;

  if (classification === 'BOTH_MISSING') {
    rawScore += 6;
  } else if (classification === 'SORT_ONLY') {
    rawScore += 4;
  } else if (classification === 'FILTER_ONLY') {
    rawScore += 2;
  }

  if (classification === 'BOTH_MISSING' && productCount >= 10) {
    rawScore += 3;
  }

  if (classification === 'SORT_ONLY' && productCount >= 10) {
    rawScore += 2;
  }

  if (classification === 'BOTH_MISSING' && productCount >= 20) {
    rawScore += 2;
  }

  if (classification !== 'BOTH_PRESENT' && !hasPagination) {
    rawScore += 1;
  }

  return {
    rawScore: Math.min(rawScore, 15),
    classification,
    productCount,
    hasPagination,
    missingSort: classification === 'FILTER_ONLY' || classification === 'BOTH_MISSING',
    missingFilter: classification === 'SORT_ONLY' || classification === 'BOTH_MISSING'
  };
}

/**
 * Derives rule confidence from the aggregate score while applying the rule-specific caps.
 */
export function getConfidence(summary: ScoreSummary): Confidence {
  if (summary.rawScore <= 0) {
    return 'low';
  }

  let confidence: Confidence = 'low';

  if (summary.rawScore >= 8) {
    confidence = 'high';
  } else if (summary.rawScore >= 4) {
    confidence = 'medium';
  }

  if (summary.classification === 'FILTER_ONLY') {
    return 'low';
  }

  if (summary.classification === 'BOTH_MISSING') {
    if (summary.productCount < 8) {
      return 'low';
    }

    if (summary.productCount < 20 && confidence === 'high') {
      return 'medium';
    }
  }

  return confidence;
}

/**
 * Maps the score summary to the normalized probability scale used by the rule engine.
 */
export function getProbability(summary: ScoreSummary): number {
  if (summary.rawScore >= 8) {
    return 1;
  }

  if (summary.rawScore >= 4) {
    return 0.7;
  }

  if (summary.rawScore >= 1) {
    return 0.4;
  }

  return 0;
}

/**
 * Determines the user impact of missing listing controls.
 */
export function getImpact(summary: ScoreSummary): Impact {
  if (summary.classification === 'BOTH_MISSING') {
    return summary.productCount >= 10 ? 'high' : 'medium';
  }

  if (summary.classification === 'SORT_ONLY') {
    return 'medium';
  }

  if (summary.classification === 'FILTER_ONLY') {
    return 'low';
  }

  return 'low';
}
