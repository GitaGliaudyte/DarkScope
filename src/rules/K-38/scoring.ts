import { Confidence, NormalizedElement } from '../../engine/types';
import {
  EXCLUDED_CONTEXT,
  EXCLUSION_SELECTORS,
  POPUP_TEXT_SIGNALS
} from './constants';

export function matchesPopupTextSignals(text: string): boolean {
  const normalized = text.toLowerCase();
  return POPUP_TEXT_SIGNALS.some((pattern) => pattern.test(normalized));
}

export function isExcludedContext(element: HTMLElement): boolean {
  const text = element.textContent?.toLowerCase() ?? '';
  const classAndId = `${element.className} ${element.id}`.toLowerCase();
  
  const hasExcludedText = EXCLUDED_CONTEXT.some((context) => text.includes(context));
  
  const hasExcludedSelector = EXCLUSION_SELECTORS.some((selector) => {
    const matched = element.closest(selector);
    return matched !== null;
  });
  
  const isNavigationElement = 
    classAndId.includes('storeswitcher') ||
    classAndId.includes('store-switcher') ||
    classAndId.includes('dropdown') ||
    classAndId.includes('nav') ||
    classAndId.includes('navigation') ||
    classAndId.includes('menu') ||
    classAndId.includes('header') ||
    classAndId.includes('cookie') ||
    classAndId.includes('consent') ||
    classAndId.includes('privacy');
  
  const rect = element.getBoundingClientRect();
  const isSmallElement = rect.width < 200 && rect.height < 100;
  
  const style = window.getComputedStyle(element);
  const isDropdownStyle = 
    style.position === 'relative' || 
    style.position === 'static' ||
    style.zIndex === 'auto';
  
  return hasExcludedText || hasExcludedSelector || isNavigationElement || (isSmallElement && isDropdownStyle);
}

export function isRealVisiblePopup(element: HTMLElement): boolean {
  if (isExcludedContext(element)) {
    return false;
  }

  const ariaModal = element.getAttribute('aria-modal');
  const role = element.getAttribute('role');
  const dataRole = element.getAttribute('data-role');
  
  if (ariaModal === 'true' || role === 'dialog' || dataRole === 'dialog') {
    return element.offsetWidth > 0 && element.offsetHeight > 0;
  }

  const style = window.getComputedStyle(element);
  const isVisible = style.position !== 'fixed' || 
    (element.offsetWidth > 0 && element.offsetHeight > 0 && style.display !== 'none');

  return isVisible;
}

export function scoreSignals(element: NormalizedElement, liveElement: HTMLElement): number {
  let score = 0;
  const text = element.text.toLowerCase();

  if (matchesPopupTextSignals(text)) {
    score += 4;
  }

  const classAndId = `${element.attributes.class ?? ''} ${element.attributes.id ?? ''}`.toLowerCase();
  if (classAndId.includes('newsletter') || classAndId.includes('subscribe') || classAndId.includes('email')) {
    score += 3;
  }

  if (element.boundingBox) {
    const { width, height } = element.boundingBox;
    if (width > 300 && height > 300) {
      score += 2;
    }
    if (width > 500 && height > 400) {
      score += 2;
    }
  }

  const hasInputFields = liveElement.querySelector('input[type="email"]') !== null ||
                        liveElement.querySelector('input[type="text"]') !== null ||
                        liveElement.querySelector('textarea') !== null;
  if (hasInputFields) {
    score += 2;
  }

  const hasCloseButton = liveElement.querySelector('[class*="close"]') !== null ||
                        liveElement.querySelector('[class*="dismiss"]') !== null ||
                        liveElement.querySelector('[aria-label*="close"]') !== null;
  if (!hasCloseButton) {
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