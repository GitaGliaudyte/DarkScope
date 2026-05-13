import { Confidence, RuleResult } from '../../engine/types';

export interface SuspiciousLinkSignals {
  hasCardLayout: boolean;
  hasContentClassPattern: boolean;
  isButtonLike: boolean;
  hasCtaPattern: boolean;
}

/**
 * Computes the capped raw K-12 score from the suspicious link signals found on the page.
 */
export function computeScore(flaggedLinks: SuspiciousLinkSignals[]): number {
  let score = 0;

  for (const flaggedLink of flaggedLinks) {
    score += 3;

    if (flaggedLink.hasCardLayout) {
      score += 2;
    }

    if (flaggedLink.hasContentClassPattern) {
      score += 1;
    }

    if (flaggedLink.isButtonLike) {
      score += 3;
    }

    if (flaggedLink.hasCtaPattern) {
      score += 1;
    }
  }

  if (flaggedLinks.length >= 3) {
    score += 2;
  }

  return Math.min(score, 15);
}

/**
 * Maps the raw K-12 score to confidence, with the single-element non-card cap applied.
 */
export function getConfidence(score: number, flaggedCount: number, singleHasCardLayout: boolean): Confidence {
  if (flaggedCount === 1 && !singleHasCardLayout) {
    return 'low';
  }

  if (score >= 8) {
    return 'high';
  }

  if (score >= 4) {
    return 'medium';
  }

  if (score >= 1) {
    return 'low';
  }

  return 'low';
}

/**
 * Derives impact from whether the page contains button-like ad links or editorial card-style links.
 */
export function getImpact(hasButtonLike: boolean, hasCardLayout: boolean): RuleResult['impact'] {
  if (hasButtonLike || hasCardLayout) {
    return 'high';
  }

  return 'medium';
}
