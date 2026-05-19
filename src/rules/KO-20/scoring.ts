import { Confidence } from '../../engine/types';
import {
  MIN_REVIEW_TEXT_LENGTH,
  MIN_REVIEWS_FOR_ANALYSIS,
  STOP_WORDS,
  USER_IDENTIFICATION_PATTERNS,
  USER_IDENTIFICATION_SELECTORS,
  EXCLUDED_CONTEXT
} from './constants';

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w));
}

export function extractReviewTexts(container: HTMLElement): string[] {
  const texts = new Set<string>();

  const elements = Array.from(
    container.querySelectorAll<HTMLElement>(
      'p, .review-text, .review-body, .comment-body'
    )
  );

  for (const el of elements) {
    const t = el.textContent?.trim() ?? '';
    if (t.length >= MIN_REVIEW_TEXT_LENGTH) {
      texts.add(t);
    }
  }

  return Array.from(texts);
}

function scoreRepeatedWords(texts: string[]): number {
  if (texts.length < MIN_REVIEWS_FOR_ANALYSIS) return 0;

  const counts = new Map<string, number>();
  const total = texts.length;

  for (const t of texts) {
    const words = new Set(tokenize(t));
    for (const w of words) {
      counts.set(w, (counts.get(w) ?? 0) + 1);
    }
  }

  const repeated = [...counts.entries()].filter(
    ([_, c]) => c / total >= 0.5
  );
  if (repeated.length === 0) return 0;

  return 2 + Math.min(repeated.length, 3);
}

function scoreMissingUserId(container: HTMLElement): number {
  const text = container.textContent ?? '';

  if (/verified\s+purchase/i.test(text)) return 0;

  const root = container.closest('li.review') ?? container;

  const hasAvatar =
    root.querySelector('img') !== null ||
    root.querySelector('[class*="avatar"]') !== null;

  const hasName =
    root.querySelector('.a-profile-name') !== null ||
    root.querySelector('[class*="profile"]') !== null;

  if (hasAvatar && hasName) return 0;

  const hasSelectors = USER_IDENTIFICATION_SELECTORS.some(
    (sel) => root.querySelector(sel) !== null
  );
  if (hasSelectors) return 0;

  const hasPatterns = USER_IDENTIFICATION_PATTERNS.some((p) =>
    p.test(text)
  );
  if (hasPatterns) return 0;

  return 3;
}

function scoreLowDiversity(texts: string[]): number {
  if (texts.length < MIN_REVIEWS_FOR_ANALYSIS) return 0;

  const lengths = texts.map((t) => t.length);
  const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
  const variance =
    lengths.reduce((a, b) => a + (b - avg) ** 2, 0) / lengths.length;

  return variance < 80 ? 1 : 0;
}

function scoreSimilarStarts(texts: string[]): number {
  if (texts.length < MIN_REVIEWS_FOR_ANALYSIS) return 0;

  const starters = texts.map((t) =>
    t.split(/\s+/).slice(0, 3).join(' ').toLowerCase()
  );

  const freq = new Map<string, number>();
  for (const s of starters) {
    freq.set(s, (freq.get(s) ?? 0) + 1);
  }

  const max = Math.max(...freq.values());
  return max / texts.length >= 0.5 ? 2 : 0;
}

function scoreSentimentUniformity(texts: string[]): number {
  if (texts.length < MIN_REVIEWS_FOR_ANALYSIS) return 0;

  const positive = ['great', 'amazing', 'perfect', 'love', 'excellent'];
  const negative = ['bad', 'terrible', 'awful', 'poor', 'hate'];

  const sentiments = texts.map((t) => {
    const lower = t.toLowerCase();
    const pos = positive.some((w) => lower.includes(w));
    const neg = negative.some((w) => lower.includes(w));
    return pos ? 1 : neg ? -1 : 0;
  });

  return new Set(sentiments).size <= 1 ? 1 : 0;
}

export function scoreReviewContainer(container: HTMLElement): number {
  const context = container.textContent?.toLowerCase() ?? '';
  if (EXCLUDED_CONTEXT.some((p) => context.includes(p))) return 0;

  const texts = extractReviewTexts(container);
  if (texts.length < MIN_REVIEWS_FOR_ANALYSIS) return 0;

  let score = 0;
  score += scoreRepeatedWords(texts);
  score += scoreMissingUserId(container);
  score += scoreLowDiversity(texts);
  score += scoreSimilarStarts(texts);
  score += scoreSentimentUniformity(texts);

  return Math.min(score, 10);
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 1) return 'low';
  return 'low';
}
