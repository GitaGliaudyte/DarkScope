import { Confidence, NormalizedElement } from '../../engine/types';
import { EXCLUDED_CONTEXT, LIMITED_TIME_PATTERNS } from './constants';

export function matchesLimitedTimePattern(text: string): boolean {
  const normalized = text.toLowerCase();
  return LIMITED_TIME_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isInExcludedContext(element: HTMLElement): boolean {
  const context = element.textContent?.toLowerCase() ?? '';
  return EXCLUDED_CONTEXT.some((phrase) => context.includes(phrase));
}

export function scoreSignals(element: NormalizedElement, liveElement: HTMLElement): number {
  const text = element.text.toLowerCase();
  let score = 0;

  if (/limited[\s-]time/.test(text)) score += 5;
  if (/ends\s+(soon|today|tonight|midnight)/.test(text)) score += 4;
  if (/only\s+\d+\s+(hours?|minutes?)\s+left/.test(text)) score += 3;
  if (/flash\s+sale/.test(text)) score += 2;

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
