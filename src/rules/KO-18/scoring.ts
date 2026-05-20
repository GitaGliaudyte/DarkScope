import { Confidence, NormalizedElement } from '../../engine/types';
import { EXCLUDED_SELECTORS, HIGH_DEMAND_PATTERNS } from './constants';

export function matchesHighDemandPattern(text: string): boolean {
  const normalized = text.toLowerCase();
  return HIGH_DEMAND_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isInExcludedContext(element: HTMLElement): boolean {
  return element.closest(EXCLUDED_SELECTORS.join(',')) !== null;
}

export function scoreSignals(_element: NormalizedElement, liveElement: HTMLElement): number {
  if (isInExcludedContext(liveElement)) {
    return 0;
  }

  return 5;
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) {
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
