import { Confidence, NormalizedElement } from '../../engine/types';
import {
  PERSONALIZATION_DISABLE_PATTERNS,
  PERSONALIZATION_DISABLE_SELECTORS,
  PERSONALIZATION_INDICATORS
} from './constants';

export function matchesPersonalizationIndicators(text: string): boolean {
  const normalized = text.toLowerCase();
  return PERSONALIZATION_INDICATORS.some((pattern) => pattern.test(normalized));
}

export function matchesDisablePatterns(text: string): boolean {
  const normalized = text.toLowerCase();
  return PERSONALIZATION_DISABLE_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function hasDisableControls(): boolean {
  const disableCandidates = Array.from(
    document.querySelectorAll<HTMLElement>(PERSONALIZATION_DISABLE_SELECTORS.join(', '))
  ).filter((el) => el.offsetWidth > 0 && el.offsetHeight > 0);

  for (const el of disableCandidates) {
    const text = el.textContent?.trim() ?? '';
    const aria = el.getAttribute('aria-label') || '';
    const title = el.getAttribute('title') || '';

    if (
      matchesDisablePatterns(text) ||
      matchesDisablePatterns(aria) ||
      matchesDisablePatterns(title)
    ) {
      return true;
    }
  }

  return false;
}

export function isRealPersonalizationBlock(element: HTMLElement): boolean {
  const hasContentItems = 
    element.querySelector('img') !== null ||
    element.querySelector('a[href*="/product/"]') !== null ||
    element.querySelector('a[href*="/item/"]') !== null ||
    element.querySelector('a[href*="/p/"]') !== null ||
    element.querySelector('[data-product-id]') !== null ||
    element.querySelector('[data-item-id]') !== null ||
    element.querySelector('[itemtype*="Product"]') !== null ||
    element.querySelector('[data-recommendation]') !== null;

  const hasGridPattern = 
    element.querySelector('[class*="grid"]') !== null ||
    element.querySelector('[class*="list"]') !== null ||
    element.querySelector('[class*="carousel"]') !== null ||
    element.querySelector('[class*="slider"]') !== null ||
    element.querySelector('[class*="swiper"]') !== null ||
    element.querySelector('[class*="shoveler"]') !== null;

  const hasGenericProductClass = 
    element.querySelector('[class*="product-"]') !== null ||
    element.querySelector('[class*="item-card"]') !== null ||
    element.querySelector('[class*="card-"]') !== null ||
    element.querySelector('[id*="recommend"]') !== null;

  const hasMultipleItems = 
    element.querySelectorAll('img').length >= 2 ||
    element.querySelectorAll('a[href*="/product/"]').length >= 2 ||
    element.querySelectorAll('[data-product-id]').length >= 2;

  return (hasContentItems && (hasGridPattern || hasGenericProductClass)) || hasMultipleItems;
}

export function scoreSignals(element: NormalizedElement, liveElement: HTMLElement): number {
  let score = 0;
  const text = element.text.toLowerCase();

  if (matchesPersonalizationIndicators(text)) {
    score += 3;
  }

  if (isRealPersonalizationBlock(liveElement)) {
    score += 2;
  }

  if (hasDisableControls()) {
    score = Math.max(0, score - 4);
  }

  return Math.max(0, Math.min(10, score));
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}