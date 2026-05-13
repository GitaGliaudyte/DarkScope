import { Confidence, NormalizedElement } from '../../engine/types';
import { CANCELLATION_KEYWORDS, DISCOURAGEMENT_PATTERNS, EXCLUDED_CONTEXT } from './constants';

export function matchesDiscouragementPattern(text: string): boolean {
  const normalized = text.toLowerCase();
  return DISCOURAGEMENT_PATTERNS.some((pattern) => pattern.test(normalized));
}

function hasCancellationKeyword(text: string): boolean {
  const normalized = text.toLowerCase();
  return CANCELLATION_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isInExcludedContext(element: HTMLElement): boolean {
  const context = element.textContent?.toLowerCase() ?? '';
  return EXCLUDED_CONTEXT.some((phrase) => context.includes(phrase));
}

export function scoreSignals(element: NormalizedElement, liveElement: HTMLElement): number {
  if (isInExcludedContext(liveElement)) {
    return 0;
  }

  let score = 0;
  const elementText = element.text.toLowerCase();

  if (matchesDiscouragementPattern(elementText)) {
    score += 4;
  }

  if (hasCancellationKeyword(elementText)) {
    score += 2;
  }

  const label = (
    liveElement.getAttribute('aria-label') ??
    liveElement.getAttribute('title') ??
    liveElement.getAttribute('data-label') ??
    ''
  ).toLowerCase();
  if (hasCancellationKeyword(label)) {
    score += 2;
  }

  return score;
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
