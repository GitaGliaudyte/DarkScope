import { Confidence, RuleResult } from '../../engine/types';

type Impact = RuleResult['impact'];

export interface ScoreSummary {
  rawScore: number;
  extraFieldsCount: number;
}

export function computeScore(extraFieldsCount: number): ScoreSummary {
  if (extraFieldsCount <= 0) {
    return {
      rawScore: 0,
      extraFieldsCount: 0
    };
  }

  const rawScore = Math.min(3 + extraFieldsCount, 10);

  return {
    rawScore,
    extraFieldsCount
  };
}

export function getConfidence(summary: ScoreSummary): Confidence {
  const score = summary.rawScore;

  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 1) return 'low';
  return 'low';
}

export function getProbability(summary: ScoreSummary): number {
  if (summary.rawScore <= 0) return 0;
  return Math.min(summary.rawScore / 10, 1);
}
export function getImpact(summary: ScoreSummary): Impact {
  if (summary.extraFieldsCount >= 3) {
    return 'medium';
  }

  if (summary.extraFieldsCount >= 1) {
    return 'low';
  }

  return 'low';
}