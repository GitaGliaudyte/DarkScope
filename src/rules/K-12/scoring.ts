import { Confidence, RuleResult } from '../../engine/types';
import { RuleSignals } from './types';

/**
 * Computes the capped raw K-12 score from the suspicious link signals found on the page.
 */
export function computeScore(findings: RuleSignals[]): number {
  let score = 0;

  for (const finding of findings) {
    score += 3;

    if (finding.hasCardLayout) {
      score += 2;
    }

    if (finding.hasContentClassPattern) {
      score += 1;
    }

    if (finding.isButtonLike) {
      score += 3;
    }

    if (finding.hasCtaPattern) {
      score += 1;
    }
  }

  if (findings.length >= 3) {
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
