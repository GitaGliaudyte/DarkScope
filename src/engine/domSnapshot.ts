// This file captures a normalized snapshot of the current page for rule-based analysis.
import { createNormalizedElement, normalizeWhitespace } from './normalizedElements';
import { NormalizedElement, PageSnapshot } from './types';

export const INTERACTIVE_SELECTORS: string[] = [
  'a[href]',
  'button',
  'form',
  'input',
  'textarea',
  'select',
  'label',
  'summary',
  'details',
  'h1',
  'h2',
  'h3',
  '[role="button"]',
  '[role="link"]',
  '[role="timer"]',
  '[aria-live]',
  '[data-countdown]',
  '[data-timer]',
  '[data-end-time]',
  '[data-target-time]',
  '[data-component*="countdown"]',
  '[data-component*="timer"]',
  '[class*="countdown"]',
  '[class*="timer"]',
  '[id*="countdown"]',
  '[id*="timer"]',
  '[class*="price"]',
  '[id*="price"]',
  '[data-price]'
];

export function collectElements(sourceDocument: Document, selectors: string[]): NormalizedElement[] {
  const deduped = new Map<string, NormalizedElement>();

  for (const selector of selectors) {
    for (const element of Array.from(sourceDocument.querySelectorAll(selector))) {
      if (!element.isConnected) {
        continue;
      }

      const normalized = createNormalizedElement(element);
      deduped.set(normalized.selector, normalized);
    }
  }

  return Array.from(deduped.values());
}

export function collectText(sourceDocument: Document): string {
  const bodyText = sourceDocument.body?.innerText ?? '';
  return normalizeWhitespace(bodyText).slice(0, 5000);
}

// Collecting all of the elements and returning them as a snapshot for rule-based analysis.
export function createPageSnapshot(sourceDocument: Document): PageSnapshot {
  const elements = collectElements(sourceDocument, INTERACTIVE_SELECTORS);
  const links = collectElements(sourceDocument, ['a[href]']);
  const buttons = collectElements(sourceDocument, ['button', 'input[type="submit"]', 'input[type="button"]']);

  return {
    url: sourceDocument.location?.href ?? window.location.href,
    title: sourceDocument.title,
    lang: sourceDocument.documentElement.lang || 'unknown',
    text: collectText(sourceDocument),
    elements,
    links,
    buttons
  };
}
