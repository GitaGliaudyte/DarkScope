import { Confidence, NormalizedElement } from '../../engine/types';
import { EXCLUDED_CONTEXT, HIGH_DEMAND_PATTERNS } from './constants';

export function matchesHighDemandPattern(text: string): boolean {
  const normalized = text.toLowerCase();
  return HIGH_DEMAND_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isInExcludedContext(element: HTMLElement): boolean {
  const context = element.textContent?.toLowerCase() ?? '';
  return EXCLUDED_CONTEXT.some((phrase) => context.includes(phrase));
}

export function scoreSignals(_element: NormalizedElement, liveElement: HTMLElement): number {
  if (isInExcludedContext(liveElement)) {
    return 0;
  }

  return 5;
}

export function getConfidence(_score: number): Confidence {
  return 'medium';
}

export function getProbability(_score: number): number {
  return 0.75;
}
