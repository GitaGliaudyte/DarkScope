import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import {
  CHECKED_INPUT_SELECTOR,
  CUSTOM_CHECKED_STATE_REGEXES,
  CUSTOM_ROLE_SELECTOR,
  CUSTOM_TOGGLE_SELECTOR,
  EXCLUDED_CONTAINER_SELECTOR,
  HIDDEN_TRUE_VALUES,
  MAX_INPUTS,
  PRIORITY_CONTAINER_SELECTOR
} from './constants';
import {
  extractPriceValues,
  getElementText,
  matchesAnyRegex,
  normalizeToken,
  resolveAssociatedLabel,
  getReferenceRect
} from './domUtils';
import { PreselectedInput } from './types';

const MAIN_PRIORITY_SELECTOR = 'main, [role="main"]';
const CONTEXT_PRIORITY_SELECTOR =
  '[class*="checkout"], [id*="checkout"], [class*="cart"], [id*="cart"], [class*="registration"], [id*="registration"]';

export function shouldExcludeElement(element: Element): boolean {
  return element.closest(EXCLUDED_CONTAINER_SELECTOR) !== null;
}

function getPriorityScore(candidate: PreselectedInput): number {
  let score = 0;

  if (candidate.control.closest('form') !== null) {
    score += 4;
  }

  if (candidate.control.closest(MAIN_PRIORITY_SELECTOR) !== null) {
    score += 3;
  }

  if (candidate.control.closest(CONTEXT_PRIORITY_SELECTOR) !== null) {
    score += 2;
  }

  if (candidate.control.closest(PRIORITY_CONTAINER_SELECTOR) !== null) {
    score += 1;
  }

  return score;
}

function compareCandidates(left: PreselectedInput, right: PreselectedInput): number {
  const priorityDifference = getPriorityScore(right) - getPriorityScore(left);

  if (priorityDifference !== 0) {
    return priorityDifference;
  }

  const leftRect = getReferenceRect(left);
  const rightRect = getReferenceRect(right);

  return (leftRect?.top ?? Number.POSITIVE_INFINITY) - (rightRect?.top ?? Number.POSITIVE_INFINITY);
}

function buildCandidateDisplayText(primaryText: string, fallbackText: string): string {
  const text = primaryText.length > 0 ? primaryText : fallbackText;
  return text.slice(0, 220);
}

export function buildNativeInputCandidate(input: HTMLInputElement, doc: Document): PreselectedInput | null {
  if (shouldExcludeElement(input)) {
    return null;
  }

  const label = resolveAssociatedLabel(input, doc);
  const fallbackText = normalizeWhitespace([input.value, input.name, input.id, getElementText(input)].filter((value) => value.length > 0).join(' '));
  const labelText = label.text.length > 0 ? label.text : fallbackText;
  const referenceElement = label.element ?? input;

  return {
    source: input,
    control: input,
    referenceElement,
    selector: generateUniqueSelector(referenceElement),
    kind: input.type === 'radio' ? 'radio' : 'checkbox',
    name: input.name ?? '',
    id: input.id ?? '',
    inputType: input.type,
    labelText,
    normalizedLabelText: normalizeToken(labelText),
    displayText: buildCandidateDisplayText(labelText, fallbackText),
    isRadio: input.type === 'radio',
    hasPriceInLabel: extractPriceValues(labelText).length > 0,
    associatedForm: input.form
  };
}

function buildOptionCandidate(option: HTMLOptionElement, doc: Document): PreselectedInput | null {
  if (shouldExcludeElement(option)) {
    return null;
  }

  const select = option.closest('select');

  if (!(select instanceof HTMLSelectElement) || shouldExcludeElement(select)) {
    return null;
  }

  const label = resolveAssociatedLabel(select, doc);
  const optionText = normalizeWhitespace(option.textContent ?? '');
  const labelText = normalizeWhitespace([label.text, optionText].filter((value) => value.length > 0).join(' '));
  const fallbackText = normalizeWhitespace([optionText, select.name, select.id].filter((value) => value.length > 0).join(' '));
  const referenceElement = label.element ?? select;

  return {
    source: option,
    control: select,
    referenceElement,
    selector: generateUniqueSelector(referenceElement),
    kind: 'option',
    name: select.name ?? '',
    id: select.id ?? '',
    inputType: 'select',
    labelText,
    normalizedLabelText: normalizeToken(labelText),
    displayText: buildCandidateDisplayText(labelText, fallbackText),
    isRadio: false,
    hasPriceInLabel: extractPriceValues(labelText).length > 0,
    associatedForm: select.form
  };
}

function findTruthyHiddenInput(element: HTMLElement): HTMLInputElement | null {
  const candidates: HTMLInputElement[] = [
    ...Array.from(element.querySelectorAll<HTMLInputElement>('input[type="hidden"]')),
    ...Array.from(element.parentElement?.querySelectorAll<HTMLInputElement>(':scope > input[type="hidden"]') ?? [])
  ];

  for (const input of candidates) {
    const value = normalizeToken(input.value);

    if (HIDDEN_TRUE_VALUES.includes(value as (typeof HIDDEN_TRUE_VALUES)[number])) {
      return input;
    }
  }

  return null;
}

function hasCheckedStateSignal(element: HTMLElement): boolean {
  const candidates: HTMLElement[] = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*')).slice(0, 12)];

  for (const candidate of candidates) {
    const attributeBlob = normalizeToken(
      [
        candidate.id,
        typeof candidate.className === 'string' ? candidate.className : '',
        ...Array.from(candidate.attributes).map((attribute) => `${attribute.name} ${attribute.value}`)
      ]
        .filter((value) => value.length > 0)
        .join(' ')
    );

    if (matchesAnyRegex(attributeBlob, CUSTOM_CHECKED_STATE_REGEXES)) {
      return true;
    }

    if (candidate instanceof SVGUseElement) {
      const hrefValue = normalizeToken(candidate.getAttribute('href') ?? candidate.getAttribute('xlink:href') ?? '');

      if (matchesAnyRegex(hrefValue, CUSTOM_CHECKED_STATE_REGEXES)) {
        return true;
      }
    }
  }

  return false;
}

function resolveSiblingText(element: HTMLElement): string {
  const parent = element.parentElement;

  if (!(parent instanceof HTMLElement)) {
    return '';
  }

  const siblingText = normalizeWhitespace(
    Array.from(parent.children)
      .filter((child) => child !== element)
      .map((child) => getElementText(child as HTMLElement))
      .filter((value) => value.length > 0)
      .join(' ')
  );

  if (siblingText.length > 0) {
    return siblingText;
  }

  const parentText = normalizeWhitespace(parent.textContent ?? '');

  if (parentText.length === 0) {
    return '';
  }

  const selfText = normalizeWhitespace(element.textContent ?? '');

  if (selfText.length > 0 && parentText.includes(selfText)) {
    return normalizeWhitespace(parentText.replace(selfText, ' '));
  }

  return parentText;
}

function buildCustomCandidate(element: HTMLElement, doc: Document): PreselectedInput | null {
  if (shouldExcludeElement(element)) {
    return null;
  }

  const hiddenInput = findTruthyHiddenInput(element);
  const role = normalizeToken(element.getAttribute('role') ?? '');
  const classIdBlob = normalizeToken(`${element.id} ${typeof element.className === 'string' ? element.className : ''}`);
  const hasToggleSignal = /checkbox|toggle|switch/.test(classIdBlob);
  const hasCheckedSignal = hasCheckedStateSignal(element);

  if (role !== 'checkbox' && role !== 'radio' && (!hasToggleSignal || (!hasCheckedSignal && hiddenInput === null))) {
    return null;
  }

  const label = resolveAssociatedLabel(element, doc);
  const siblingText = resolveSiblingText(element);
  const fallbackText = normalizeWhitespace(
    [
      getElementText(element),
      siblingText,
      hiddenInput?.name ?? '',
      hiddenInput?.id ?? '',
      element.id,
      typeof element.className === 'string' ? element.className : ''
    ]
      .filter((value) => value.length > 0)
      .join(' ')
  );
  const labelText = label.text.length > 0 ? label.text : siblingText.length > 0 ? siblingText : fallbackText;
  const name = hiddenInput?.name ?? element.getAttribute('name') ?? '';
  const id = hiddenInput?.id ?? element.id ?? '';

  return {
    source: element,
    control: element,
    referenceElement: label.element ?? element,
    selector: generateUniqueSelector(label.element ?? element),
    kind:
      role === 'radio'
        ? 'custom_radio'
        : role === 'checkbox'
          ? 'custom_checkbox'
          : 'custom_toggle',
    name,
    id,
    inputType: role.length > 0 ? role : 'custom',
    labelText,
    normalizedLabelText: normalizeToken(labelText),
    displayText: buildCandidateDisplayText(labelText, fallbackText),
    isRadio: role === 'radio',
    hasPriceInLabel: extractPriceValues(labelText).length > 0,
    associatedForm: hiddenInput?.form ?? (element.closest('form') instanceof HTMLFormElement ? element.closest('form') : null)
  };
}

export function hasAnyPreselectedInputs(doc: Document): boolean {
  if (doc.querySelector(CHECKED_INPUT_SELECTOR) !== null) {
    return true;
  }

  if (doc.querySelector(CUSTOM_ROLE_SELECTOR) !== null) {
    return true;
  }

  return Array.from(doc.querySelectorAll<HTMLElement>(CUSTOM_TOGGLE_SELECTOR)).some((element) => {
    return findTruthyHiddenInput(element) !== null || hasCheckedStateSignal(element);
  });
}

/**
 * Collects up to 50 prioritized pre-selected native and custom form inputs from the live document.
 */
export function findPreselectedInputs(doc: Document = document): PreselectedInput[] {
  if (!(doc.body instanceof HTMLElement)) {
    return [];
  }

  const candidates: PreselectedInput[] = [];
  const seen = new Set<HTMLElement>();
  const nativeMatches = Array.from(doc.querySelectorAll(CHECKED_INPUT_SELECTOR)).filter(
    (node): node is HTMLInputElement | HTMLOptionElement => node instanceof HTMLInputElement || node instanceof HTMLOptionElement
  );

  for (const node of nativeMatches) {
    const candidate = node instanceof HTMLInputElement ? buildNativeInputCandidate(node, doc) : buildOptionCandidate(node, doc);

    if (candidate === null || seen.has(candidate.source)) {
      continue;
    }

    seen.add(candidate.source);
    candidates.push(candidate);
  }

  for (const element of Array.from(doc.querySelectorAll<HTMLElement>(CUSTOM_ROLE_SELECTOR))) {
    const candidate = buildCustomCandidate(element, doc);

    if (candidate === null || seen.has(candidate.source)) {
      continue;
    }

    seen.add(candidate.source);
    candidates.push(candidate);
  }

  for (const element of Array.from(doc.querySelectorAll<HTMLElement>(CUSTOM_TOGGLE_SELECTOR))) {
    const candidate = buildCustomCandidate(element, doc);

    if (candidate === null || seen.has(candidate.source)) {
      continue;
    }

    seen.add(candidate.source);
    candidates.push(candidate);
  }

  return candidates.sort(compareCandidates).slice(0, MAX_INPUTS);
}
