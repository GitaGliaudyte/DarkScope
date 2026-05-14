import { generateUniqueSelector, isVisibleElement, normalizeWhitespace } from '../../engine/normalizedElements';
import { AnalysisContext } from '../../engine/types';
import {
  DELETION_CONTROL_SELECTOR,
  DELETION_GROUPS,
  HIDDEN_CONTAINER_SELECTOR,
  LOW_CONTRAST_CLASS_PATTERN
} from './constants';
import { DeletionCandidate, HiddenDeletionCandidate } from './types';

function normalizeValue(value: string | null | undefined): string {
  return normalizeWhitespace(value ?? '').toLowerCase();
}

function tokenizeSearchValue(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function matchesOrderedTokens(value: string, tokens: readonly string[], maxGap = 3): boolean {
  const haystack = tokenizeSearchValue(value);
  let previousIndex = -1;

  for (const token of tokens) {
    const nextIndex = haystack.findIndex((part, index) => index > previousIndex && part === token);

    if (nextIndex === -1) {
      return false;
    }

    if (previousIndex !== -1 && nextIndex - previousIndex - 1 > maxGap) {
      return false;
    }

    previousIndex = nextIndex;
  }

  return true;
}

function getElementText(element: Element): string {
  if (element instanceof HTMLInputElement) {
    return normalizeWhitespace(element.value);
  }

  return normalizeWhitespace(element.textContent ?? '');
}

function getElementSearchFields(element: Element): { text: string; href: string; ariaLabel: string } {
  return {
    text: normalizeValue(getElementText(element)),
    href: normalizeValue(element.getAttribute('href')),
    ariaLabel: normalizeValue(element.getAttribute('aria-label'))
  };
}

function matchDeletionGroup(element: Element): DeletionCandidate['matchedGroup'] | null {
  const fields = getElementSearchFields(element);

  for (const tokens of DELETION_GROUPS.A) {
    if (
      matchesOrderedTokens(fields.text, tokens) ||
      matchesOrderedTokens(fields.href, tokens) ||
      matchesOrderedTokens(fields.ariaLabel, tokens)
    ) {
      return 'A';
    }
  }

  for (const tokens of DELETION_GROUPS.B) {
    if (
      matchesOrderedTokens(fields.text, tokens) ||
      matchesOrderedTokens(fields.href, tokens) ||
      matchesOrderedTokens(fields.ariaLabel, tokens)
    ) {
      return 'B';
    }
  }

  for (const tokens of DELETION_GROUPS.C) {
    if (
      matchesOrderedTokens(fields.text, tokens) ||
      matchesOrderedTokens(fields.href, tokens) ||
      matchesOrderedTokens(fields.ariaLabel, tokens)
    ) {
      return 'C';
    }
  }

  for (const keyword of DELETION_GROUPS.D) {
    if (fields.href.includes(keyword)) {
      return 'D';
    }
  }

  return null;
}

function hasDeletionKeywordText(element: Element): boolean {
  const fields = getElementSearchFields(element);
  return (
    DELETION_GROUPS.A.some(
      (tokens) => matchesOrderedTokens(fields.text, tokens) || matchesOrderedTokens(fields.ariaLabel, tokens)
    ) ||
    DELETION_GROUPS.B.some(
      (tokens) => matchesOrderedTokens(fields.text, tokens) || matchesOrderedTokens(fields.ariaLabel, tokens)
    ) ||
    DELETION_GROUPS.C.some(
      (tokens) => matchesOrderedTokens(fields.text, tokens) || matchesOrderedTokens(fields.ariaLabel, tokens)
    )
  );
}

function hasDeletionKeywordHref(element: Element): boolean {
  const href = normalizeValue(element.getAttribute('href'));
  return DELETION_GROUPS.D.some((keyword) => href.includes(keyword));
}

function classifyHiddenReason(element: Element): HiddenDeletionCandidate['reason'] | null {
  const htmlElement = element instanceof HTMLElement ? element : null;
  const computedStyle = htmlElement === null ? null : window.getComputedStyle(htmlElement);
  const className = element.getAttribute('class') ?? '';

  if (computedStyle !== null) {
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return 'display_none';
    }

    if (computedStyle.opacity === '0') {
      return 'visually_hidden';
    }
  }

  const hiddenContainer = element.closest(HIDDEN_CONTAINER_SELECTOR);

  if (hiddenContainer?.getAttribute('aria-hidden') === 'true') {
    return 'aria_hidden';
  }

  if (hiddenContainer !== null || LOW_CONTRAST_CLASS_PATTERN.test(className)) {
    return 'visually_hidden';
  }

  if (element instanceof HTMLAnchorElement && computedStyle !== null) {
    const backgroundColor = computedStyle.backgroundColor.replace(/\s+/g, '');
    const color = computedStyle.color.replace(/\s+/g, '');

    if (color.length > 0 && color === backgroundColor) {
      return 'visually_hidden';
    }
  }

  return null;
}

function isAccessibleElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const computedStyle = window.getComputedStyle(element);
  return isVisibleElement(element) && computedStyle.opacity !== '0';
}

export function findDeletionCandidates(): {
  deletionSignals: DeletionCandidate[];
  hiddenSignals: HiddenDeletionCandidate[];
} {
  const deletionSignals: DeletionCandidate[] = [];
  const hiddenSignals: HiddenDeletionCandidate[] = [];
  const hiddenKeys = new Set<string>();

  for (const element of Array.from(document.querySelectorAll<Element>(DELETION_CONTROL_SELECTOR))) {
    const matchedGroup = matchDeletionGroup(element);

    if (matchedGroup === null) {
      continue;
    }

    const selector = generateUniqueSelector(element);
    deletionSignals.push({
      element,
      selector,
      text: getElementText(element) || normalizeWhitespace(element.getAttribute('href') ?? ''),
      matchedGroup,
      visible: isAccessibleElement(element)
    });
  }

  for (const element of Array.from(document.querySelectorAll<Element>('body *'))) {
    const matchesDeletionText = hasDeletionKeywordText(element);
    const matchesDeletionHref = element instanceof HTMLAnchorElement && hasDeletionKeywordHref(element);

    if (!matchesDeletionText && !matchesDeletionHref) {
      continue;
    }

    const reason = classifyHiddenReason(element);

    if (reason === null) {
      continue;
    }

    const key = `${generateUniqueSelector(element)}::${reason}`;

    if (hiddenKeys.has(key)) {
      continue;
    }

    hiddenKeys.add(key);
    hiddenSignals.push({ element, reason });
  }

  return { deletionSignals, hiddenSignals };
}

export function getInteractiveElementCount(snapshot: AnalysisContext['snapshot']): number {
  const selectors = new Set<string>();

  for (const link of snapshot.links) {
    selectors.add(link.selector);
  }

  for (const button of snapshot.buttons) {
    selectors.add(button.selector);
  }

  for (const element of snapshot.elements) {
    if (element.tag === 'input') {
      selectors.add(element.selector);
    }
  }

  return selectors.size;
}

export function getEvidenceText(element: Element): string {
  const text = getElementText(element);

  if (text.length > 0) {
    return text.slice(0, 200);
  }

  return normalizeWhitespace(element.getAttribute('href') ?? '').slice(0, 200);
}

export function getSummaryHeadingText(): string {
  const headings = [
    normalizeWhitespace(document.querySelector('h1')?.textContent ?? ''),
    ...Array.from(document.querySelectorAll('h2')).map((element) => normalizeWhitespace(element.textContent ?? ''))
  ]
    .filter((text) => text.length > 0)
    .join(' ');

  return headings.slice(0, 200);
}
