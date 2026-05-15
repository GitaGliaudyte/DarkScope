import { Confidence, RuleResult } from '../../engine/types';
import { WEIGHT_THRESHOLDS } from './constants';

type Impact = RuleResult['impact'];

export interface ScoreableHigherPricedCard {
  classification: 'WEAK_BIAS' | 'MODERATE_BIAS' | 'STRONG_BIAS';
}

export interface ScoreSummary {
  rawScore: number;
  weakBiasCount: number;
  moderateBiasCount: number;
  strongBiasCount: number;
  onlyWeakBias: boolean;
}

/**
 * Computes the capped raw score for all higher-priced cards that are visually emphasized above the cheapest baseline.
 */
export function computeScore(cards: ScoreableHigherPricedCard[]): ScoreSummary {
  let rawScore = 0;
  let weakBiasCount = 0;
  let moderateBiasCount = 0;
  let strongBiasCount = 0;

  for (const card of cards) {
    if (card.classification === 'STRONG_BIAS') {
      rawScore += 5;
      strongBiasCount += 1;
      continue;
    }

    if (card.classification === 'MODERATE_BIAS') {
      rawScore += 3;
      moderateBiasCount += 1;
      continue;
    }

    rawScore += 1;
    weakBiasCount += 1;
  }

  return {
    rawScore: Math.min(rawScore, 15),
    weakBiasCount,
    moderateBiasCount,
    strongBiasCount,
    onlyWeakBias: weakBiasCount > 0 && moderateBiasCount === 0 && strongBiasCount === 0
  };
}

/**
 * Derives rule confidence from the aggregate score.
 */
export function getConfidence(summary: ScoreSummary): Confidence {
  if (summary.onlyWeakBias) {
    return 'low';
  }

  if (summary.rawScore >= 8) {
    return 'high';
  }

  if (summary.rawScore >= 4) {
    return 'medium';
  }

  return 'low';
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
 * Determines the user impact of the detected higher-price emphasis.
 */
export function getImpact(cards: ScoreableHigherPricedCard[]): Impact {
  if (cards.some((card) => card.classification === 'STRONG_BIAS')) {
    return 'high';
  }

  if (cards.some((card) => card.classification === 'MODERATE_BIAS')) {
    return 'medium';
  }

  return cards.length > 0 ? 'low' : 'low';
}
