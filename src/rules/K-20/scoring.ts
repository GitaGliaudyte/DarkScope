import { Confidence, RuleResult } from '../../engine/types';

type Impact = RuleResult['impact'];

interface ScoreableFinding {
  classification: 'LARGE' | 'DOMINANT' | 'FULL_TAKEOVER';
  blocksContent: boolean;
  hasDismissMechanism: boolean;
}

interface ScoreSummary {
  rawScore: number;
  flaggedCount: number;
  hasBlockingOverlay: boolean;
  hasDismissibleOverlay: boolean;
  hasUndismissibleOverlay: boolean;
  hasOverlappingOverlays: boolean;
  hasFullTakeoverWithoutDismiss: boolean;
}

/**
 * Computes the capped raw score for all large top-layer overlays detected on the page.
 */
export function computeScore(findings: ScoreableFinding[], hasOverlappingOverlays: boolean): ScoreSummary {
  let rawScore = 0;
  let hasBlockingOverlay = false;
  let hasDismissibleOverlay = false;
  let hasUndismissibleOverlay = false;
  let hasFullTakeoverWithoutDismiss = false;

  for (const finding of findings) {
    if (finding.classification === 'FULL_TAKEOVER') {
      rawScore += 5;
    } else if (finding.classification === 'DOMINANT') {
      rawScore += 3;
    } else {
      rawScore += 2;
    }

    hasBlockingOverlay = hasBlockingOverlay || finding.blocksContent;
    hasDismissibleOverlay = hasDismissibleOverlay || finding.hasDismissMechanism;
    hasUndismissibleOverlay = hasUndismissibleOverlay || !finding.hasDismissMechanism;
    hasFullTakeoverWithoutDismiss =
      hasFullTakeoverWithoutDismiss || (finding.classification === 'FULL_TAKEOVER' && !finding.hasDismissMechanism);
  }

  if (hasBlockingOverlay) {
    rawScore += 2;
  }

  if (hasUndismissibleOverlay) {
    rawScore += 2;
  }

  if (hasOverlappingOverlays) {
    rawScore += 2;
  }

  return {
    rawScore: Math.min(rawScore, 15),
    flaggedCount: findings.length,
    hasBlockingOverlay,
    hasDismissibleOverlay,
    hasUndismissibleOverlay,
    hasOverlappingOverlays,
    hasFullTakeoverWithoutDismiss
  };
}

/**
 * Derives confidence from the aggregate overlay score while applying dismissal-specific caps.
 */
export function getConfidence(summary: ScoreSummary): Confidence {
  let confidence: Confidence = 'low';

  if (summary.rawScore >= 8) {
    confidence = 'high';
  } else if (summary.rawScore >= 4) {
    confidence = 'medium';
  }

  if (summary.hasDismissibleOverlay && confidence === 'high') {
    confidence = 'medium';
  }

  if (summary.hasFullTakeoverWithoutDismiss) {
    confidence = 'high';
  }

  return confidence;
}

/**
 * Maps the normalized overlay score to the probability scale used by the rule engine.
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
 * Determines the user impact of the detected overlay behavior.
 */
export function getImpact(findings: ScoreableFinding[]): Impact {
  if (findings.length === 0) {
    return 'low';
  }

  if (findings.some((finding) => finding.classification === 'FULL_TAKEOVER' && !finding.hasDismissMechanism)) {
    return 'high';
  }

  if (findings.some((finding) => finding.classification === 'DOMINANT')) {
    return 'medium';
  }

  if (findings.some((finding) => finding.classification === 'FULL_TAKEOVER' && finding.hasDismissMechanism)) {
    return 'medium';
  }

  return 'low';
}
