import { generateUniqueSelector, isVisibleElement, normalizeWhitespace } from '../../engine/normalizedElements';
import { ControlDetection } from './types';

export function normalizeToken(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
  );
}

export function getElementText(element: Element | null): string {
  if (!(element instanceof HTMLElement)) {
    return '';
  }

  if (element.matches('script, style, noscript, template')) {
    return '';
  }

  const textValue = element.innerText;
  const value =
    element instanceof HTMLInputElement
      ? [element.value, element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? ''].join(' ')
      : [element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? '', textValue].join(' ');

  return normalizeWhitespace(value);
}

export function getElementAttributeBlob(element: Element): string {
  if (!(element instanceof HTMLElement)) {
    return '';
  }

  return normalizeToken(
    [
      element.id,
      typeof element.className === 'string' ? element.className : '',
      element.getAttribute('name') ?? '',
      element.getAttribute('aria-label') ?? '',
      element.getAttribute('title') ?? '',
      element.getAttribute('role') ?? ''
    ]
      .filter((value) => value.length > 0)
      .join(' ')
  );
}

export function includesAny(haystack: string, terms: readonly string[]): boolean {
  return terms.some((term) => haystack.includes(normalizeToken(term)));
}

export function matchesAnyPattern(haystack: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

export function buildControlDetection(element: HTMLElement, score: number): ControlDetection {
  return {
    found: true,
    selector: generateUniqueSelector(element),
    text: getElementText(element),
    boundingBox: element.getBoundingClientRect(),
    score,
    debugElement: element
  };
}

export function getEmptyControlDetection(): ControlDetection {
  return {
    found: false,
    selector: null,
    text: '',
    boundingBox: null,
    score: 0,
    debugElement: null
  };
}

export function getStrongerDetection(left: ControlDetection, right: ControlDetection): ControlDetection {
  return (right.score ?? 0) > (left.score ?? 0) ? right : left;
}

export function isActuallyVisible(element: HTMLElement): boolean {
  if (!isVisibleElement(element)) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

export function isOverbroadControlContainer(element: HTMLElement): boolean {
  if (element === document.body || element === document.documentElement) {
    return true;
  }

  const rect = element.getBoundingClientRect();
  const viewportWidth = Math.max(window.innerWidth, 1);
  const viewportHeight = Math.max(window.innerHeight, 1);
  const widthRatio = rect.width / viewportWidth;
  const heightRatio = rect.height / viewportHeight;
  const areaRatio = (rect.width * rect.height) / (viewportWidth * viewportHeight);
  const descendantCount = element.querySelectorAll('*').length;

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    descendantCount >= 60 &&
    (areaRatio >= 0.6 || (widthRatio >= 0.9 && heightRatio >= 0.75))
  );
}

function findVisibleController(doc: Document, target: HTMLElement, patterns: readonly RegExp[]): HTMLElement | null {
  if (target.id.length === 0) {
    return null;
  }

  const escapedId = CSS.escape(target.id);
  const selector = [
    `button[aria-controls="${escapedId}"]`,
    `summary[aria-controls="${escapedId}"]`,
    `[role="button"][aria-controls="${escapedId}"]`,
    `a[aria-controls="${escapedId}"]`,
    `a[href="#${escapedId}"]`
  ].join(', ');

  for (const candidate of Array.from(doc.querySelectorAll<HTMLElement>(selector))) {
    if (!isActuallyVisible(candidate)) {
      continue;
    }

    if (matchesAnyPattern(normalizeToken(getElementText(candidate)), patterns)) {
      return candidate;
    }
  }

  return null;
}

export function isExposedElement(doc: Document, element: HTMLElement, controllerPatterns: readonly RegExp[]): boolean {
  return isActuallyVisible(element) || findVisibleController(doc, element, controllerPatterns) !== null;
}
