// This file centralizes DOM element normalization helpers shared by snapshots and rules.
import { NormalizedElement } from './types';

const DEFAULT_TEXT_LIMIT = 300;

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function getMeaningfulClass(element: Element): string | null {
  const className = typeof element.className === 'string' ? element.className : '';
  const match = className
    .split(/\s+/)
    .map((part) => part.trim())
    .find((part) => part.length > 1 && !/^\d/.test(part));

  return match ?? null;
}

function getNthChildSelector(element: Element): string {
  const parts: string[] = [];
  let current: Element | null = element;

  while (current !== null && current.nodeType === Node.ELEMENT_NODE) {
    const tag = current.tagName.toLowerCase();
    const currentTagName = current.tagName;

    if (current.id.length > 0) {
      parts.unshift(`${tag}#${CSS.escape(current.id)}`);
      break;
    }

    const parent: Element | null = current.parentElement;
    const siblings: Element[] =
      parent === null
        ? []
        : Array.from<Element>(parent.children).filter((child) => child.tagName === currentTagName);
    const sameTagIndex = siblings.findIndex((child) => child === current) + 1;
    parts.unshift(`${tag}:nth-of-type(${Math.max(sameTagIndex, 1)})`);
    current = parent;
  }

  return parts.join(' > ');
}

export function generateUniqueSelector(element: Element): string {
  const tag = element.tagName.toLowerCase();

  if (element.id.length > 0) {
    return `${tag}#${CSS.escape(element.id)}`;
  }

  const meaningfulClass = getMeaningfulClass(element);

  if (meaningfulClass !== null) {
    const classSelector = `${tag}.${CSS.escape(meaningfulClass)}`;

    if (document.querySelectorAll(classSelector).length === 1) {
      return classSelector;
    }
  }

  return getNthChildSelector(element);
}

export function readElementAttributes(element: Element): Record<string, string> {
  const attributes: Record<string, string> = {};

  for (const attribute of Array.from(element.attributes)) {
    attributes[attribute.name] = attribute.value;
  }

  return attributes;
}

export function isVisibleElement(element: HTMLElement): boolean {
  const computedStyle = window.getComputedStyle(element);
  return element.offsetParent !== null && computedStyle.visibility !== 'hidden' && computedStyle.display !== 'none';
}

export function getNormalizedText(element: Element, limit = DEFAULT_TEXT_LIMIT): string {
  return normalizeWhitespace(element.textContent ?? '').slice(0, limit);
}

export function createNormalizedElement(element: Element): NormalizedElement {
  const htmlElement = element as HTMLElement;

  return {
    selector: generateUniqueSelector(element),
    tag: element.tagName.toLowerCase(),
    text: getNormalizedText(element),
    attributes: readElementAttributes(element),
    visible: isVisibleElement(htmlElement),
    boundingBox: element.getBoundingClientRect()
  };
}
