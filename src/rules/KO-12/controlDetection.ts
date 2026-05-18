import { FILTER_PATTERNS, PAGINATION_PATTERNS, PRICE_RANGE_PATTERNS, SORT_PATTERNS } from './constants';
import {
  buildControlDetection,
  getElementAttributeBlob,
  getElementText,
  getEmptyControlDetection,
  getStrongerDetection,
  isActuallyVisible,
  isExposedElement,
  isOverbroadControlContainer,
  matchesAnyPattern,
  normalizeToken
} from './domUtils';
import { ControlDetection } from './types';

function getExtendedContextText(element: HTMLElement): string {
  const parts: string[] = [getElementText(element)];
  let current: HTMLElement | null = element.parentElement;
  let depth = 0;

  while (current !== null && depth < 3) {
    parts.push(getElementText(current));
    parts.push(getElementText(current.previousElementSibling));
    parts.push(getElementText(current.nextElementSibling));
    current = current.parentElement;
    depth += 1;
  }

  const labelledBy = element.getAttribute('aria-labelledby')?.trim() ?? '';

  if (labelledBy.length > 0) {
    for (const id of labelledBy.split(/\s+/)) {
      const labelElement = document.getElementById(id);

      if (labelElement instanceof HTMLElement) {
        parts.push(getElementText(labelElement));
      }
    }
  }

  return normalizeToken(parts.filter((value) => value.length > 0).join(' '));
}

function getLocalContainer(element: HTMLElement): HTMLElement | null {
  return element.closest('section, aside, form, div, ul, ol, nav, details');
}

function getFacetDescriptorText(element: HTMLElement): string {
  const labels = Array.from(
    element.querySelectorAll<HTMLElement>('h1, h2, h3, h4, h5, h6, legend, summary, button, [role="heading"], label')
  )
    .slice(0, 12)
    .map((label) => getElementText(label))
    .filter((value) => value.length > 0);

  return normalizeToken(labels.join(' '));
}

function countStrongFacetControls(element: HTMLElement): number {
  return element.querySelectorAll(
    'input[type="checkbox"], input[type="radio"], input[type="range"], [role="checkbox"], [role="radio"], [role="switch"]'
  ).length;
}

function getFilterEvidenceScore(element: HTMLElement): number {
  if (isOverbroadControlContainer(element)) {
    return 0;
  }

  const attributeBlob = getElementAttributeBlob(element);
  const descriptorText = getFacetDescriptorText(element);
  const facetCount = countStrongFacetControls(element);
  let score = 0;

  if (facetCount === 0) {
    return 0;
  }

  if (matchesAnyPattern(attributeBlob, FILTER_PATTERNS.containers)) {
    score += 3;
  }

  if (facetCount >= 4) {
    score += 3;
  } else if (facetCount >= 2) {
    score += 2;
  } else if (facetCount === 1) {
    score += 1;
  }

  if (matchesAnyPattern(descriptorText, FILTER_PATTERNS.facetDescriptors)) {
    score += 2;
  }

  if (element.matches('aside')) {
    score += 1;
  }

  return score;
}

function hasInteractiveChild(element: HTMLElement): boolean {
  return element.querySelector('button, select, input, [role="button"], [role="combobox"], [role="listbox"]') !== null;
}

function hasNearbySortChooser(element: HTMLElement): boolean {
  const container = getLocalContainer(element);

  if (!(container instanceof HTMLElement)) {
    return false;
  }

  return (
    container.querySelector('select') !== null ||
    container.querySelector('[role="listbox"]') !== null ||
    container.querySelector('[role="combobox"]') !== null ||
    container.querySelector('ul') !== null
  );
}

function findControlledFacetContainer(element: HTMLElement, doc: Document): HTMLElement | null {
  const controlsId = element.getAttribute('aria-controls')?.trim() ?? '';

  if (controlsId.length > 0) {
    const controlled = doc.getElementById(controlsId);

    if (controlled instanceof HTMLElement) {
      return controlled;
    }
  }

  return getLocalContainer(element);
}

function findFilterContainerAncestor(element: HTMLElement): HTMLElement | null {
  let current: HTMLElement | null = element;

  while (current !== null) {
    if (matchesAnyPattern(getElementAttributeBlob(current), FILTER_PATTERNS.containers)) {
      return current;
    }

    current = current.parentElement;
  }

  return null;
}

function hasPaginationContent(element: HTMLElement): boolean {
  const attributeMatch = matchesAnyPattern(getElementAttributeBlob(element), PAGINATION_PATTERNS.containers);

  if (attributeMatch) {
    return true;
  }

  const text = normalizeToken(getElementText(element));
  const pageNumbers = text.match(/\b\d+\b/g) ?? [];
  const interactiveCount = element.querySelectorAll('a, button').length;

  if (!element.matches('nav')) {
    return false;
  }

  return interactiveCount > 0 && (pageNumbers.length >= 2 || matchesAnyPattern(text, PAGINATION_PATTERNS.next));
}

export function detectSorting(doc: Document = document): ControlDetection {
  let bestDetection = getEmptyControlDetection();

  for (const select of Array.from(doc.querySelectorAll<HTMLSelectElement>('select'))) {
    if (!isExposedElement(doc, select, SORT_PATTERNS.buttons)) {
      continue;
    }

    const attributeBlob = getElementAttributeBlob(select);
    const contextBlob = getExtendedContextText(select);
    const optionText = normalizeToken(Array.from(select.options).map((option) => option.text).join(' '));
    const optionCount = select.options.length;
    let score = 0;

    if (matchesAnyPattern(attributeBlob, SORT_PATTERNS.attributes)) {
      score += 3;
    }

    if (matchesAnyPattern(contextBlob, SORT_PATTERNS.labels)) {
      score += 2;
    }

    if (matchesAnyPattern(optionText, SORT_PATTERNS.options) || matchesAnyPattern(optionText, SORT_PATTERNS.ordering)) {
      score += optionCount >= 3 ? 2 : 1;
    }

    if (score >= 4) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(select, score));
    }
  }

  for (const control of Array.from(doc.querySelectorAll<HTMLElement>('button, a, [role="button"], summary'))) {
    if (!isActuallyVisible(control)) {
      continue;
    }

    const text = normalizeToken(getElementText(control));
    const contextBlob = getExtendedContextText(control);
    let score = 0;

    if (matchesAnyPattern(text, SORT_PATTERNS.buttons)) {
      score += 3;
    }

    if (matchesAnyPattern(contextBlob, SORT_PATTERNS.labels)) {
      score += 1;
    }

    if (matchesAnyPattern(contextBlob, SORT_PATTERNS.ordering)) {
      score += 1;
    }

    if (hasNearbySortChooser(control)) {
      score += 1;
    }

    if (score >= 4) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(control, score));
    }
  }

  for (const control of Array.from(doc.querySelectorAll<HTMLElement>('[role="listbox"], [role="combobox"]'))) {
    if (!isExposedElement(doc, control, SORT_PATTERNS.buttons)) {
      continue;
    }

    const contextBlob = getExtendedContextText(control);
    let score = 0;

    if (matchesAnyPattern(contextBlob, SORT_PATTERNS.attributes) || matchesAnyPattern(contextBlob, SORT_PATTERNS.labels)) {
      score += 2;
    }

    if (matchesAnyPattern(contextBlob, SORT_PATTERNS.ordering)) {
      score += 2;
    }

    if (score >= 4) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(control, score));
    }
  }

  for (const container of Array.from(doc.querySelectorAll<HTMLElement>('ul, div'))) {
    if (!isExposedElement(doc, container, SORT_PATTERNS.buttons)) {
      continue;
    }

    if (isOverbroadControlContainer(container)) {
      continue;
    }

    const attributeBlob = getElementAttributeBlob(container);
    const contextBlob = getExtendedContextText(container);

    if (!matchesAnyPattern(attributeBlob, SORT_PATTERNS.attributes) && !matchesAnyPattern(contextBlob, SORT_PATTERNS.labels)) {
      continue;
    }

    const childText = normalizeToken(
      Array.from(container.children)
        .map((child) => getElementText(child))
        .join(' ')
    );
    let score = 0;

    if (matchesAnyPattern(attributeBlob, SORT_PATTERNS.attributes) || matchesAnyPattern(contextBlob, SORT_PATTERNS.labels)) {
      score += 2;
    }

    if (hasInteractiveChild(container)) {
      score += 1;
    }

    if (container.children.length >= 2 && matchesAnyPattern(childText, SORT_PATTERNS.ordering)) {
      score += 2;
    }

    if (score >= 4) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(container, score));
    }
  }

  return bestDetection;
}

export function detectFiltering(doc: Document = document): ControlDetection {
  let bestDetection = getEmptyControlDetection();

  for (const region of Array.from(doc.querySelectorAll<HTMLElement>('[role="group"], [role="region"]'))) {
    if (!isExposedElement(doc, region, FILTER_PATTERNS.buttons)) {
      continue;
    }

    if (isOverbroadControlContainer(region)) {
      continue;
    }

    const attributeBlob = getElementAttributeBlob(region);
    let score = getFilterEvidenceScore(region);

    if (matchesAnyPattern(attributeBlob, FILTER_PATTERNS.labels) || matchesAnyPattern(getFacetDescriptorText(region), FILTER_PATTERNS.labels)) {
      score += 2;
    }

    if (score >= 5) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(region, score));
    }
  }

  for (const control of Array.from(doc.querySelectorAll<HTMLElement>('input[type="checkbox"], input[type="radio"], select'))) {
    const container = findFilterContainerAncestor(control);

    if (container !== null) {
      if (!isExposedElement(doc, container, FILTER_PATTERNS.buttons)) {
        continue;
      }

      if (isOverbroadControlContainer(container)) {
        continue;
      }

      const score = getFilterEvidenceScore(container);

      if (score >= 5) {
        bestDetection = getStrongerDetection(bestDetection, buildControlDetection(container, score));
      }
    }
  }

  for (const control of Array.from(doc.querySelectorAll<HTMLElement>('button, a, [role="button"], summary'))) {
    if (!isActuallyVisible(control)) {
      continue;
    }

    const text = normalizeToken(getElementText(control));
    const container = findControlledFacetContainer(control, doc);
    const containerScore = container instanceof HTMLElement ? getFilterEvidenceScore(container) : 0;
    let score = 0;

    if (matchesAnyPattern(text, FILTER_PATTERNS.buttons)) {
      score += 3;
    }

    score += Math.min(containerScore, 3);

    if (score >= 6) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(control, score));
    }
  }

  const rangeInput = doc.querySelector<HTMLInputElement>(PRICE_RANGE_PATTERNS.rangeInputSelector);

  if (rangeInput !== null) {
    if (!isExposedElement(doc, rangeInput, FILTER_PATTERNS.buttons)) {
      return bestDetection;
    }

    const container = getLocalContainer(rangeInput) ?? rangeInput.parentElement;
    const descriptorText = container instanceof HTMLElement ? getFacetDescriptorText(container) : '';
    const contextBlob = getExtendedContextText(rangeInput);

    if (
      matchesAnyPattern(contextBlob, FILTER_PATTERNS.priceTerms) &&
      (matchesAnyPattern(descriptorText, FILTER_PATTERNS.facetDescriptors) || matchesAnyPattern(descriptorText, FILTER_PATTERNS.labels))
    ) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(rangeInput, 5));
    }
  }

  for (const container of Array.from(doc.querySelectorAll<HTMLElement>('aside, section, div, form'))) {
    if (!isExposedElement(doc, container, FILTER_PATTERNS.buttons)) {
      continue;
    }

    if (isOverbroadControlContainer(container)) {
      continue;
    }

    const score = getFilterEvidenceScore(container);
    const descriptorText = getFacetDescriptorText(container);

    if (
      score >= 6 &&
      (matchesAnyPattern(getElementAttributeBlob(container), FILTER_PATTERNS.containers) ||
        matchesAnyPattern(descriptorText, FILTER_PATTERNS.labels))
    ) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(container, score));
    }
  }

  for (const container of Array.from(doc.querySelectorAll<HTMLElement>('aside, section, div, form'))) {
    if (!isExposedElement(doc, container, FILTER_PATTERNS.buttons)) {
      continue;
    }

    if (isOverbroadControlContainer(container)) {
      continue;
    }

    const numericInputs = Array.from(container.querySelectorAll<HTMLInputElement>(PRICE_RANGE_PATTERNS.numericInputSelector));
    let score = 0;

    if (numericInputs.length < 2) {
      continue;
    }

    const contextBlob = getExtendedContextText(container);

    if (!matchesAnyPattern(contextBlob, FILTER_PATTERNS.priceTerms)) {
      continue;
    }

    score += 3;

    if (
      matchesAnyPattern(getFacetDescriptorText(container), FILTER_PATTERNS.facetDescriptors) ||
      matchesAnyPattern(getFacetDescriptorText(container), FILTER_PATTERNS.labels)
    ) {
      score += 1;
    }

    if (score >= 4) {
      bestDetection = getStrongerDetection(bestDetection, buildControlDetection(container, score));
    }
  }

  return bestDetection;
}

export function hasPagination(doc: Document = document): boolean {
  for (const element of Array.from(doc.querySelectorAll<HTMLElement>('nav, div, ul'))) {
    if (hasPaginationContent(element)) {
      return true;
    }
  }

  return false;
}
