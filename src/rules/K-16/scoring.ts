import { Confidence, RuleResult } from '../../engine/types';

type Impact = RuleResult['impact'];

export interface ScoreableGroupEvaluation {
  hasSuspiciousPercentage: boolean;
  hasInconsistentMath: boolean;
  hasMathCheck: boolean;
  largeInconsistency: boolean;
}

export interface ScoreSummary {
  rawScore: number;
  suspiciousPercentageCount: number;
  inconsistentMathCount: number;
  hasLargeInconsistency: boolean;
  onlyPercentageWithoutMath: boolean;
}

/**
 * Computes the capped raw score for all evaluated price groups on the page.
 */
export function computeScore(groups: ScoreableGroupEvaluation[]): ScoreSummary {
  let rawScore = 0;
  let suspiciousPercentageCount = 0;
  let inconsistentMathCount = 0;
  let hasLargeInconsistency = false;
  let hasMathCheckedSuspiciousGroup = false;

  for (const group of groups) {
    if (group.hasSuspiciousPercentage) {
      rawScore += 3;
      suspiciousPercentageCount += 1;
      hasMathCheckedSuspiciousGroup = hasMathCheckedSuspiciousGroup || group.hasMathCheck;
    }

    if (group.hasInconsistentMath) {
      rawScore += 4;
      inconsistentMathCount += 1;
    }

    if (group.hasSuspiciousPercentage && group.hasInconsistentMath) {
      rawScore += 2;
    }

    if (group.largeInconsistency) {
      hasLargeInconsistency = true;
    }
  }

  if (suspiciousPercentageCount >= 2) {
    rawScore += 2;
  }

  if (hasLargeInconsistency) {
    rawScore += 2;
  }

  return {
    rawScore: Math.min(rawScore, 15),
    suspiciousPercentageCount,
    inconsistentMathCount,
    hasLargeInconsistency,
    onlyPercentageWithoutMath:
      suspiciousPercentageCount > 0 && inconsistentMathCount === 0 && hasMathCheckedSuspiciousGroup === false
  };
}

/**
 * Derives rule confidence from the aggregated score summary.
 */
export function getConfidence(summary: ScoreSummary): Confidence {
  let confidence: Confidence = 'low';

  if (summary.rawScore >= 9) {
    confidence = 'high';
  } else if (summary.rawScore >= 5) {
    confidence = 'medium';
  }

  if (summary.onlyPercentageWithoutMath && confidence === 'high') {
    confidence = 'medium';
  }

  if (summary.inconsistentMathCount > 0 && confidence === 'low') {
    confidence = 'medium';
  }

  return confidence;
}

/**
 * Maps the score summary to the normalized rule probability used by the engine.
 */
export function getProbability(summary: ScoreSummary): number {
  if (summary.rawScore >= 9) {
    return 1;
  }

  if (summary.rawScore >= 5) {
    return 0.7;
  }

  if (summary.rawScore >= 1) {
    return 0.4;
  }

  return 0;
}

/**
 * Determines the user impact of the detected discount manipulation signals.
 */
export function getImpact(groups: ScoreableGroupEvaluation[]): Impact {
  if (groups.some((group) => group.hasInconsistentMath)) {
    return 'high';
  }

  const suspiciousGroups = groups.filter((group) => group.hasSuspiciousPercentage);

  if (suspiciousGroups.length === 0) {
    return 'low';
  }

  if (suspiciousGroups.every((group) => group.hasMathCheck === false)) {
    return 'medium';
  }

  return 'low';
}

