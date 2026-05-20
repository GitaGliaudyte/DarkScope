import { Confidence, NormalizedElement } from '../../engine/types';
import { USER_ACTIVITY_PATTERNS } from './constants';

export function matchesUserActivityPattern(text: string): boolean {
  const normalized = text.toLowerCase();
  return USER_ACTIVITY_PATTERNS.some((pattern) => pattern.test(normalized));
}


export function scoreSignals(_element: NormalizedElement, liveElement: HTMLElement): number {

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
