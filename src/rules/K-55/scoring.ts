import { Confidence, NormalizedElement } from '../../engine/types';
import { EXCLUDED_CONTEXT, QUANTITY_PATTERNS, STOCK_IDENTIFIER_PATTERN, URGENCY_CLASS_PATTERN } from './constants';

export function matchesQuantityPattern(text: string): boolean {
  const normalized = text.toLowerCase();
  return QUANTITY_PATTERNS.some((pattern) => pattern.test(normalized));
}

export function hasStockIdentifier(text: string): boolean {
  return STOCK_IDENTIFIER_PATTERN.test(text.toLowerCase());
}

export function hasUrgencyClassOrId(element: NormalizedElement): boolean {
  const className = (element.attributes.class ?? '').toLowerCase();
  const id = (element.attributes.id ?? '').toLowerCase();
  const component = (element.attributes['data-component'] ?? '').toLowerCase();
  return URGENCY_CLASS_PATTERN.test(className) || URGENCY_CLASS_PATTERN.test(id) || URGENCY_CLASS_PATTERN.test(component);
}

function isReddishColor(color: string): boolean {
  const normalized = color.trim().toLowerCase();
  const redKeywords = ['red', 'crimson', 'maroon', 'firebrick', 'tomato', 'orange', 'orangered', 'coral'];
  if (redKeywords.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch !== null) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return r > 150 && g < 120 && b < 120;
  }

  const hexMatch = normalized.match(/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i);
  if (hexMatch !== null) {
    const r = parseInt(hexMatch[1], 16);
    const g = parseInt(hexMatch[2], 16);
    const b = parseInt(hexMatch[3], 16);
    return r > 150 && g < 120 && b < 120;
  }

  return false;
}

function isHighlightBackground(color: string): boolean {
  const normalized = color.trim().toLowerCase();
  if (normalized === 'transparent' || normalized === 'rgba(0, 0, 0, 0)' || normalized.includes('none')) {
    return false;
  }

  const bgKeywords = ['yellow', 'gold', 'amber', 'orange', 'red', 'pink', 'lightcoral', 'lightyellow', 'lemonchiffon'];
  if (bgKeywords.some((keyword) => normalized.includes(keyword))) {
    return true;
  }

  const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (rgbMatch !== null) {
    const r = parseInt(rgbMatch[1], 10);
    const g = parseInt(rgbMatch[2], 10);
    const b = parseInt(rgbMatch[3], 10);
    return r > 200 && g > 150 && b < 150;
  }

  const hexMatch = normalized.match(/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i);
  if (hexMatch !== null) {
    const r = parseInt(hexMatch[1], 16);
    const g = parseInt(hexMatch[2], 16);
    const b = parseInt(hexMatch[3], 16);
    return r > 200 && g > 150 && b < 150;
  }

  return false;
}

export function isVisuallyHighlighted(element: HTMLElement): boolean {
  const computedStyle = window.getComputedStyle(element);
  const color = computedStyle.color;
  const backgroundColor = computedStyle.backgroundColor;
  const fontWeight = computedStyle.fontWeight;

  const textRed = isReddishColor(color);
  const bgHighlight = isHighlightBackground(backgroundColor);
  const isBold = fontWeight === 'bold' || parseInt(fontWeight, 10) >= 600;

  if (textRed || bgHighlight || isBold) {
    return true;
  }

  const parent = element.parentElement;
  if (parent !== null) {
    const parentStyle = window.getComputedStyle(parent);
    if (isReddishColor(parentStyle.color) || isHighlightBackground(parentStyle.backgroundColor)) {
      return true;
    }
  }

  return false;
}

function isInExcludedContext(element: HTMLElement): boolean {
  const context = element.textContent?.toLowerCase() ?? '';
  return EXCLUDED_CONTEXT.some((phrase) => context.includes(phrase));
}

export function scoreSignals(element: NormalizedElement, liveElement: HTMLElement): number {
  let score = 0;
  const elementText = element.text.toLowerCase();

  if (matchesQuantityPattern(elementText)) {
    score += 4;
  } else if (hasStockIdentifier(elementText)) {
    score += 2;
  }

  if (isVisuallyHighlighted(liveElement)) {
    score += 3;
  }

  if (hasUrgencyClassOrId(element)) {
    score += 2;
  }

  if (isInExcludedContext(liveElement)) {
    return 0;
  }

  return score;
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) {
    return 'high';
  }

  if (score >= 5) {
    return 'medium';
  }

  return 'low';
}

export function getProbability(score: number): number {
  if (score >= 8) {
    return 1;
  }

  if (score >= 6) {
    return 0.75;
  }

  if (score >= 4) {
    return 0.5;
  }

  return 0.25;
}
