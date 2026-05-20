import { Confidence, NormalizedElement } from '../../engine/types';
import { USER_ACTIVITY_PATTERNS } from './constants';

export function matchesUserActivityPattern(text: string): boolean {
  const normalized = text.toLowerCase();
  return USER_ACTIVITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function scoreSignals(element: NormalizedElement): number {
  const text = element.text.toLowerCase();
  let score = 0;

  if (matchesUserActivityPattern(text)) {
    score += 3;
  }

  const numberMatch = text.match(/\b(\d+)\b/);
  if (numberMatch) {
    const num = parseInt(numberMatch[1], 10);
    if (num >= 20) score += 2;
    else if (num >= 5) score += 1;
  }

  if (
    /just\s+(bought|purchased|ordered|added)/i.test(text) ||
    /recently\s+(bought|purchased|sold|added)/i.test(text)
  ) {
    score += 2;
  }

  if (
    /popular\s+right\s+now/i.test(text) ||
    /\bviewing\s+now\b/i.test(text) ||
    /\bcurrently\s+viewing\b/i.test(text)
  ) {
    score += 3;
  }

  return Math.max(0, Math.min(10, score));
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}
