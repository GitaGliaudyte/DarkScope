import { Confidence, RuleResult } from '../../engine/types';

export function downgradeImpact(impact: RuleResult['impact']): RuleResult['impact'] {
  if (impact === 'high') {
    return 'medium';
  }

  if (impact === 'medium') {
    return 'low';
  }

  return 'low';
}

export function impactRank(impact: RuleResult['impact']): number {
  if (impact === 'high') {
    return 3;
  }

  if (impact === 'medium') {
    return 2;
  }

  return 1;
}

export function getConfidence(brokenLinkCount: number): Confidence {
  if (brokenLinkCount >= 6) {
    return 'high';
  }

  if (brokenLinkCount >= 3) {
    return 'medium';
  }

  return 'low';
}

export function getProbability(brokenLinkCount: number): number {
  if (brokenLinkCount >= 6) {
    return 1;
  }

  if (brokenLinkCount >= 3) {
    return 0.75;
  }

  if (brokenLinkCount >= 1) {
    return 0.5;
  }

  return 0;
}
