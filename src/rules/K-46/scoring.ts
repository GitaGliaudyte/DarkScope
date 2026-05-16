import { Confidence, NormalizedElement } from '../../engine/types';
import {
  EXCLUSION_PATTERNS,
  EXCLUSION_SELECTORS,
  NEWSLETTER_MARKETING_PATTERNS
} from './constants';

export function matchesNewsletterMarketingPatterns(text: string): boolean {
  const normalized = text.toLowerCase();
  return NEWSLETTER_MARKETING_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function matchesExclusionPatterns(text: string): boolean {
  const normalized = text.toLowerCase();
  return EXCLUSION_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function isExcludedContext(element: HTMLElement): boolean {
  const text = element.textContent?.toLowerCase() ?? '';
  const classAndId = `${element.className} ${element.id}`.toLowerCase();
  
  return EXCLUSION_PATTERNS.some((pattern) => pattern.test(text)) ||
         EXCLUSION_SELECTORS.some((selector) => {
           const matched = element.closest(selector);
           return matched !== null;
         }) ||
         classAndId.includes('terms') ||
         classAndId.includes('privacy') ||
         classAndId.includes('agreement') ||
         classAndId.includes('required');
}

export function isPreCheckedCheckbox(element: HTMLElement): boolean {
  if (element.tagName === 'INPUT' && (element as HTMLInputElement).type === 'checkbox') {
    return element.hasAttribute('checked');
  }
  
  const ariaChecked = element.getAttribute('aria-checked');
  if (ariaChecked === 'true') {
    return true;
  }
  
  const checkedClass = element.className.toLowerCase();
  const checkedId = element.id.toLowerCase();
  
  return checkedClass.includes('checked') || 
         checkedClass.includes('selected') ||
         checkedId.includes('checked') ||
         checkedId.includes('selected');
}

export function getCheckboxLabelText(element: HTMLElement): string {
  const label = element.closest('label');
  if (label) {
    return label.textContent?.trim() ?? '';
  }
  
  const labelId = element.getAttribute('aria-labelledby');
  if (labelId) {
    const labelElement = document.getElementById(labelId);
    if (labelElement) {
      return labelElement.textContent?.trim() ?? '';
    }
  }
  
  const parent = element.parentElement;
  if (parent) {
    return parent.textContent?.trim() ?? '';
  }
  
  return '';
}

export function scoreSignals(element: NormalizedElement, liveElement: HTMLElement): number {
  let score = 0;
  
  const labelText = getCheckboxLabelText(liveElement);
  const normalizedText = labelText.toLowerCase();
  
  if (!isPreCheckedCheckbox(liveElement)) {
    return 0;
  }
  
  if (matchesExclusionPatterns(normalizedText)) {
    return 0;
  }
  
  if (matchesNewsletterMarketingPatterns(normalizedText)) {
    score += 5;
  }
  
  if (normalizedText.includes('newsletter')) {
    score += 3;
  }
  
  if (normalizedText.includes('marketing')) {
    score += 3;
  }
  
  if (normalizedText.includes('promotional')) {
    score += 2;
  }
  
  if (normalizedText.includes('offers') || normalizedText.includes('deals')) {
    score += 2;
  }
  
  const classAndId = `${element.attributes.class ?? ''} ${element.attributes.id ?? ''}`.toLowerCase();
  if (classAndId.includes('newsletter') || classAndId.includes('marketing')) {
    score += 2;
  }
  
  if (liveElement.hasAttribute('checked') && !liveElement.hasAttribute('required')) {
    score += 1;
  }
  
  return Math.max(0, Math.min(10, score));
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) {
    return 'high';
  }
  
  if (score >= 4) {
    return 'medium';
  }
  
  return 'low';
}
