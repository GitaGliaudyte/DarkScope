import { Confidence } from '../../engine/types';
import {
  CONFLICTED_CONFIDENCE_CAP,
  HIGH_SCORE_THRESHOLD,
  LARGE_NAV_CATEGORY_MIN,
  LOW_SCORE_THRESHOLD,
  MEDIUM_SCORE_THRESHOLD
} from './constants';
import { RuleSignals } from './types';

export function computeScore(signals: RuleSignals): number {
  if (signals.hasPrivacyInNavigation) {
    return 0;
  }

  let score = 5;

  if (signals.navigationCategoryCount >= LARGE_NAV_CATEGORY_MIN) {
    score += 3;
  }

  if (signals.hasPrivacyInBodyOnly) {
    score += 2;
  }

  if (signals.urlSignal === 'main' && signals.navigationSignal === 'main') {
    score += 2;
  } else if (signals.urlSignal === 'main' && signals.navigationSignal === 'ambiguous') {
    score += 1;
  }

  return Math.min(score, 10);
}

export function getConfidence(score: number, conflicted: boolean): Confidence {
  let confidence: Confidence = 'low';

  if (score >= HIGH_SCORE_THRESHOLD) {
    confidence = 'high';
  } else if (score >= MEDIUM_SCORE_THRESHOLD) {
    confidence = 'medium';
  } else if (score >= LOW_SCORE_THRESHOLD) {
    confidence = 'low';
  }

  if (!conflicted) {
    return confidence;
  }

  if (confidence === 'high') {
    return CONFLICTED_CONFIDENCE_CAP;
  }

  return confidence;
}

export function getProbability(score: number): number {
  if (score >= HIGH_SCORE_THRESHOLD) {
    return 1;
  }

  if (score >= MEDIUM_SCORE_THRESHOLD) {
    return 0.7;
  }

  if (score >= LOW_SCORE_THRESHOLD) {
    return 0.4;
  }

  return 0;
}
