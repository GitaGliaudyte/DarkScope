import { Confidence, NormalizedElement } from '../../engine/types';
import { EXCLUDED_SELECTORS, HIGH_DEMAND_PATTERNS } from './constants';

export function matchesHighDemandPattern(text: string): boolean {
  const normalized = text.toLowerCase();
  return HIGH_DEMAND_PATTERNS.some((pattern) => pattern.test(normalized));
}

function isInExcludedContext(element: HTMLElement): boolean {
  return element.closest(EXCLUDED_SELECTORS.join(',')) !== null;
}

export function scoreSignals(element: NormalizedElement, liveElement: HTMLElement): number {
  const text = element.text.toLowerCase();
  let score = 0;

  if (isInExcludedContext(liveElement)) {
    return 0;
  }

  if (matchesHighDemandPattern(text)) {
    score += 3;
  }

  const numberMatch = text.match(/\b(\d+)\b/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10);
    if (num >= 50) score += 3;
    else if (num >= 20) score += 2;
    else if (num >= 5) score += 1;
  }

  if (
    /selling\s+fast/i.test(text) ||
    /selling\s+out/i.test(text) ||
    /trending\s+now/i.test(text) ||
    /flying\s+off\s+the\s+shelves/i.test(text)
  ) {
    score += 3;
  }

  if (
    /best\s*seller/i.test(text) ||
    /top\s*seller/i.test(text) ||
    /hot\s+(item|product|seller)/i.test(text)
  ) {
    score += 2;
  }

  return Math.max(0, Math.min(10, score));
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}
