import { normalizeWhitespace } from '../../engine/normalizedElements';
import { parsePrice } from '../KO-7/parsing';
import { LabelResolution, PreselectedInput } from './types';

const PRICE_TOKEN_PATTERN =
  /(?:\$|\u20AC|\u00A3|\u00A5|kr|z\u0142)\s*-?\d[\d\s.,]*|-?\d[\d\s.,]*\s*(?:\$|\u20AC|\u00A3|\u00A5|kr|z\u0142)/gi;

export function normalizeToken(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
  );
}

export function getElementText(element: HTMLElement | null): string {
  if (element === null) {
    return '';
  }

  return normalizeWhitespace(
    [element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? '', element.textContent ?? '']
      .filter((value) => value.length > 0)
      .join(' ')
  );
}

export function isVisibleElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    element.isConnected &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0 &&
    rect.width > 0 &&
    rect.height > 0
  );
}

export function includesAny(haystack: string, terms: readonly string[]): boolean {
  return terms.some((term) => haystack.includes(normalizeToken(term)));
}

export function matchesAnyRegex(haystack: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

export function extractPriceValues(text: string): number[] {
  const tokens = normalizeWhitespace(text).match(PRICE_TOKEN_PATTERN) ?? [];
  return tokens
    .map((token) => parsePrice(token))
    .filter((value): value is number => value !== null);
}

export function resolveAssociatedLabel(control: HTMLElement, doc: Document): LabelResolution {
  if (control.id.length > 0) {
    const matchingLabel = doc.querySelector(`label[for="${CSS.escape(control.id)}"]`);

    if (matchingLabel instanceof HTMLElement) {
      const text = getElementText(matchingLabel);

      if (text.length > 0) {
        return {
          text,
          element: matchingLabel
        };
      }
    }
  }

  const wrappingLabel = control.closest('label');

  if (wrappingLabel instanceof HTMLElement) {
    const text = getElementText(wrappingLabel);

    if (text.length > 0) {
      return {
        text,
        element: wrappingLabel
      };
    }
  }

  const labelledBy = normalizeWhitespace(control.getAttribute('aria-labelledby') ?? '');

  if (labelledBy.length > 0) {
    const ids = labelledBy.split(/\s+/).filter((value) => value.length > 0);
    const elements = ids
      .map((id) => doc.getElementById(id))
      .filter((element): element is HTMLElement => element instanceof HTMLElement);
    const text = normalizeWhitespace(elements.map((element) => getElementText(element)).filter((value) => value.length > 0).join(' '));

    if (text.length > 0) {
      return {
        text,
        element: elements[0] ?? null
      };
    }
  }

  const ariaLabel = normalizeWhitespace(control.getAttribute('aria-label') ?? '');

  if (ariaLabel.length > 0) {
    return {
      text: ariaLabel,
      element: control
    };
  }

  return {
    text: '',
    element: null
  };
}

export function getReferenceRect(candidate: PreselectedInput): DOMRect | null {
  const referenceRect = candidate.referenceElement.getBoundingClientRect();

  if (referenceRect.width > 0 && referenceRect.height > 0) {
    return referenceRect;
  }

  const controlRect = candidate.control.getBoundingClientRect();
  return controlRect.width > 0 && controlRect.height > 0 ? controlRect : null;
}

export function getActionElementText(element: HTMLElement): string {
  if (element instanceof HTMLInputElement) {
    return normalizeWhitespace([element.value, element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? ''].join(' '));
  }

  return getElementText(element);
}

export function getRectDistance(left: DOMRect, right: DOMRect): number {
  const horizontalGap = Math.max(0, Math.max(left.left - right.right, right.left - left.right));
  const verticalGap = Math.max(0, Math.max(left.top - right.bottom, right.top - left.bottom));

  if (horizontalGap === 0) {
    return verticalGap;
  }

  if (verticalGap === 0) {
    return horizontalGap;
  }

  return Math.hypot(horizontalGap, verticalGap);
}
