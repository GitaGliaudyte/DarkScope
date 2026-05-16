import { Confidence, RuleResult } from '../../engine/types';
import { MIN_CONFIDENCE_SAMPLE_COVERAGE } from './constants';

type Impact = RuleResult['impact'];
type LlmConfidence = 'high' | 'medium' | 'low';

export interface ScoreableFlaggedRegion {
  region: string;
  severity: 'high' | 'medium' | 'low';
}

export interface ScoreSummary {
  rawScore: number;
  highSeverityCount: number;
  mediumSeverityCount: number;
  lowSeverityCount: number;
  hasLegalRegion: boolean;
  hasConsentRegion: boolean;
  onlyLowSeverity: boolean;
}

function normalizeRegion(region: string): string {
  return region.trim().toLowerCase();
}

/**
 * Computes the capped raw score for flagged language-mismatch regions returned by the LLM.
 */
export function computeScore(findings: ScoreableFlaggedRegion[]): ScoreSummary {
  let rawScore = 0;
  let highSeverityCount = 0;
  let mediumSeverityCount = 0;
  let lowSeverityCount = 0;
  let hasLegalRegion = false;
  let hasConsentRegion = false;

  for (const finding of findings) {
    const region = normalizeRegion(finding.region);

    if (finding.severity === 'high') {
      rawScore += 4;
      highSeverityCount += 1;
    } else if (finding.severity === 'medium') {
      rawScore += 2;
      mediumSeverityCount += 1;
    } else {
      rawScore += 1;
      lowSeverityCount += 1;
    }

    hasLegalRegion = hasLegalRegion || region.includes('legal') || region.includes('term');
    hasConsentRegion = hasConsentRegion || region.includes('consent') || region.includes('cookie');
  }

  if (highSeverityCount >= 2) {
    rawScore += 2;
  }

  if (hasLegalRegion) {
    rawScore += 3;
  }

  if (hasConsentRegion) {
    rawScore += 3;
  }

  return {
    rawScore: Math.min(rawScore, 15),
    highSeverityCount,
    mediumSeverityCount,
    lowSeverityCount,
    hasLegalRegion,
    hasConsentRegion,
    onlyLowSeverity: lowSeverityCount > 0 && highSeverityCount === 0 && mediumSeverityCount === 0
  };
}

/**
 * Derives rule confidence from the LLM confidence and the aggregate mismatch score.
 */
export function getConfidence(summary: ScoreSummary, llmConfidence: LlmConfidence, sampleCount: number): Confidence {
  let confidence: Confidence;

  if (llmConfidence === 'low') {
    confidence = 'low';
  } else if (llmConfidence === 'medium') {
    confidence = 'medium';
  } else {
    confidence = summary.rawScore >= 8 ? 'high' : 'medium';
  }

  if (summary.onlyLowSeverity) {
    confidence = 'low';
  }

  if (sampleCount < MIN_CONFIDENCE_SAMPLE_COVERAGE && confidence === 'high') {
    confidence = 'medium';
  }

  return confidence;
}

/**
 * Maps the aggregate mismatch score to the normalized probability scale used by the engine.
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
 * Determines the user impact of the flagged language mismatches.
 */
export function getImpact(findings: ScoreableFlaggedRegion[]): Impact {
  if (findings.some((finding) => finding.severity === 'high')) {
    return 'high';
  }

  if (findings.some((finding) => finding.severity === 'medium')) {
    return 'medium';
  }

  return 'low';
}
