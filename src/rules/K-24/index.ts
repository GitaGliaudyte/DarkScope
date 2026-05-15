import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import { defaultPageClassifier } from '../../engine/pageClassifier';
import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { parsePrice } from '../K-16/parsing';
import {
  CHECKED_INPUT_SELECTOR,
  CUSTOM_CHECKED_STATE_REGEXES,
  CUSTOM_ROLE_SELECTOR,
  CUSTOM_TOGGLE_SELECTOR,
  DECISION_BUTTON_SELECTOR,
  DECISION_CTA_TERMS,
  EXCLUDED_CONTAINER_SELECTOR,
  FORM_SUBMIT_SELECTOR,
  HIDDEN_TRUE_VALUES,
  MAX_INPUTS,
  NEUTRAL_INPUT_PATTERNS,
  PERSISTENT_LOGIN_NAME_REGEXES,
  PRIORITY_CONTAINER_SELECTOR,
  PROXIMITY_THRESHOLD_PX,
  RULE_ID,
  SUSPICIOUS_LABEL_REGEXES,
  SUSPICIOUS_NAME_REGEXES
} from './constants';
import { computeScore, getConfidence, getImpact, getProbability, ScoreablePreselectedInput } from './scoring';

const MAIN_PRIORITY_SELECTOR = 'main, [role="main"]';
const CONTEXT_PRIORITY_SELECTOR =
  '[class*="checkout"], [id*="checkout"], [class*="cart"], [id*="cart"], [class*="registration"], [id*="registration"]';
const GROUP_CONTAINER_SELECTOR = 'fieldset, [role="group"], [role="radiogroup"], [class*="group"], [id*="group"], form';
const PRICE_TOKEN_PATTERN =
  /(?:\$|\u20AC|\u00A3|\u00A5|kr|z\u0142)\s*-?\d[\d\s.,]*|-?\d[\d\s.,]*\s*(?:\$|\u20AC|\u00A3|\u00A5|kr|z\u0142)/gi;

type CandidateKind = 'checkbox' | 'radio' | 'option' | 'custom_checkbox' | 'custom_radio' | 'custom_toggle';
type SuspiciousCategory =
  | 'paid_addon'
  | 'marketing'
  | 'subscription'
  | 'donation'
  | 'data_sharing'
  | 'legal_consent'
  | 'persistent_login';
type Classification = 'SUSPICIOUS' | 'NEUTRAL';
type Adjacency = 'DECISION_ADJACENT' | 'ISOLATED';

interface LabelResolution {
  text: string;
  element: HTMLElement | null;
}

interface PreselectedInput {
  source: HTMLElement;
  control: HTMLElement;
  referenceElement: HTMLElement;
  selector: string;
  kind: CandidateKind;
  name: string;
  id: string;
  inputType: string;
  labelText: string;
  normalizedLabelText: string;
  displayText: string;
  isRadio: boolean;
  hasPriceInLabel: boolean;
  associatedForm: HTMLFormElement | null;
}

interface ClassifiedInput extends PreselectedInput, ScoreablePreselectedInput {
  classification: Classification;
  category: SuspiciousCategory | null;
  reason: string;
}

function normalizeToken(value: string): string {
  return normalizeWhitespace(
    value
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
      .replace(/[_-]+/g, ' ')
      .toLowerCase()
  );
}

function getElementText(element: HTMLElement | null): string {
  if (element === null) {
    return '';
  }

  return normalizeWhitespace(
    [element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? '', element.textContent ?? '']
      .filter((value) => value.length > 0)
      .join(' ')
  );
}

function isVisibleElement(element: HTMLElement): boolean {
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

function shouldExcludeElement(element: Element): boolean {
  return element.closest(EXCLUDED_CONTAINER_SELECTOR) !== null;
}

function includesAny(haystack: string, terms: readonly string[]): boolean {
  return terms.some((term) => haystack.includes(normalizeToken(term)));
}

function matchesAnyRegex(haystack: string, patterns: readonly RegExp[]): boolean {
  return patterns.some((pattern) => pattern.test(haystack));
}

function extractPriceValues(text: string): number[] {
  const tokens = normalizeWhitespace(text).match(PRICE_TOKEN_PATTERN) ?? [];
  return tokens
    .map((token) => parsePrice(token))
    .filter((value): value is number => value !== null);
}

function resolveAssociatedLabel(control: HTMLElement, doc: Document): LabelResolution {
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

function getReferenceRect(candidate: PreselectedInput): DOMRect | null {
  const referenceRect = candidate.referenceElement.getBoundingClientRect();

  if (referenceRect.width > 0 && referenceRect.height > 0) {
    return referenceRect;
  }

  const controlRect = candidate.control.getBoundingClientRect();
  return controlRect.width > 0 && controlRect.height > 0 ? controlRect : null;
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

function buildNativeInputCandidate(input: HTMLInputElement, doc: Document): PreselectedInput | null {
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

function hasAnyPreselectedInputs(doc: Document): boolean {
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

function isInRequiredFieldset(candidate: PreselectedInput): boolean {
  const fieldset = candidate.control.closest('fieldset');

  if (!(fieldset instanceof HTMLFieldSetElement)) {
    return false;
  }

  const legend = fieldset.querySelector('legend');
  return legend instanceof HTMLElement && includesAny(normalizeToken(legend.textContent ?? ''), NEUTRAL_INPUT_PATTERNS.requiredLegend);
}

function isSoleCheckboxInGroup(candidate: PreselectedInput): boolean {
  if (candidate.isRadio) {
    return false;
  }

  const group = candidate.control.closest(GROUP_CONTAINER_SELECTOR) ?? candidate.control.parentElement;

  if (!(group instanceof HTMLElement)) {
    return true;
  }

  const checkboxCount = Array.from(group.querySelectorAll('input[type="checkbox"], [role="checkbox"]')).filter(
    (element): element is HTMLElement => element instanceof HTMLElement && !shouldExcludeElement(element)
  ).length;

  return checkboxCount <= 1;
}

function getRadioGroupElements(candidate: PreselectedInput, doc: Document): HTMLInputElement[] {
  if (!(candidate.control instanceof HTMLInputElement) || candidate.control.type !== 'radio' || candidate.name.length === 0) {
    return [];
  }

  const root: ParentNode = candidate.control.form ?? doc;
  const selector = `input[type="radio"][name="${CSS.escape(candidate.name)}"]`;

  return Array.from(root.querySelectorAll<HTMLInputElement>(selector)).filter(
    (input) => !shouldExcludeElement(input) && input.isConnected
  );
}

function isHighestPricedRadio(candidate: PreselectedInput, doc: Document): boolean {
  const group = getRadioGroupElements(candidate, doc);

  if (group.length < 2) {
    return false;
  }

  const selectedPrice = Math.max(...extractPriceValues(candidate.labelText), Number.NEGATIVE_INFINITY);

  if (!Number.isFinite(selectedPrice)) {
    return false;
  }

  const groupPrices = group
    .map((input) => {
      const probe = buildNativeInputCandidate(input, doc);

      if (probe === null) {
        return null;
      }

      const values = extractPriceValues(probe.labelText);

      if (values.length === 0) {
        return null;
      }

      return Math.max(...values);
    })
    .filter((value): value is number => value !== null);

  if (groupPrices.length < 2) {
    return false;
  }

  const highestPrice = Math.max(...groupPrices);
  const lowestPrice = Math.min(...groupPrices);

  return highestPrice > lowestPrice && selectedPrice >= highestPrice;
}

function getCategory(candidate: PreselectedInput): {
  category: SuspiciousCategory | null;
  isPaidAddon: boolean;
  isMarketing: boolean;
  isSubscription: boolean;
  isDonation: boolean;
  isDataSharing: boolean;
  isLegalConsent: boolean;
  isPersistentLogin: boolean;
} {
  const labelText = candidate.normalizedLabelText;
  const nameBlob = normalizeToken(`${candidate.name} ${candidate.id}`);
  const isPaidAddon = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.paidAddOns) || candidate.hasPriceInLabel;
  const isMarketing =
    matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.marketing) || matchesAnyRegex(nameBlob, SUSPICIOUS_NAME_REGEXES);
  const isSubscription = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.subscriptions);
  const isDonation = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.donations);
  const isDataSharing = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.dataSharing);
  const isLegalConsent = matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.legalConsent);
  const isPersistentLogin =
    matchesAnyRegex(labelText, SUSPICIOUS_LABEL_REGEXES.persistentLogin) ||
    ((labelText.includes('signed in') || labelText.includes('logged in')) &&
      matchesAnyRegex(nameBlob, PERSISTENT_LOGIN_NAME_REGEXES)) ||
    matchesAnyRegex(nameBlob, PERSISTENT_LOGIN_NAME_REGEXES);

  let category: SuspiciousCategory | null = null;

  if (isSubscription) {
    category = 'subscription';
  } else if (isPaidAddon) {
    category = 'paid_addon';
  } else if (isMarketing) {
    category = 'marketing';
  } else if (isDonation) {
    category = 'donation';
  } else if (isDataSharing) {
    category = 'data_sharing';
  } else if (isLegalConsent) {
    category = 'legal_consent';
  } else if (isPersistentLogin) {
    category = 'persistent_login';
  }

  return {
    category,
    isPaidAddon,
    isMarketing,
    isSubscription,
    isDonation,
    isDataSharing,
    isLegalConsent,
    isPersistentLogin
  };
}

function buildReason(candidate: ClassifiedInput): string {
  const categoryLabel =
    candidate.category === 'subscription'
      ? 'subscription'
      : candidate.category === 'paid_addon'
        ? 'paid add-on'
        : candidate.category === 'marketing'
          ? 'marketing consent'
          : candidate.category === 'donation'
            ? 'donation'
            : candidate.category === 'legal_consent'
              ? 'legal/privacy consent'
            : candidate.category === 'persistent_login'
              ? 'remembered account/device'
              : 'data-sharing preference';
  const reasonParts = [`Pre-selected ${categoryLabel} option`];

  if (candidate.hasPriceInLabel) {
    reasonParts.push('label includes a price');
  }

  if (candidate.isHighestPricedRadio) {
    reasonParts.push('selected radio is the highest-priced option in its group');
  }

  if (candidate.adjacency === 'DECISION_ADJACENT') {
    reasonParts.push('sits near a purchase or submit action');
  } else {
    reasonParts.push('appears away from the main decision action');
  }

  return reasonParts.join('; ');
}

function getActionElementText(element: HTMLElement): string {
  if (element instanceof HTMLInputElement) {
    return normalizeWhitespace([element.value, element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? ''].join(' '));
  }

  return getElementText(element);
}

function getRectDistance(left: DOMRect, right: DOMRect): number {
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

/**
 * Classifies a pre-selected input as suspicious or neutral using the rule-specific heuristics.
 */
export function classifyInput(candidate: PreselectedInput, doc: Document = document): ClassifiedInput {
  if (isInRequiredFieldset(candidate)) {
    return {
      ...candidate,
      classification: 'NEUTRAL',
      category: null,
      adjacency: 'ISOLATED',
      isPaidAddon: false,
      isMarketing: false,
      isSubscription: false,
      isDonation: false,
      isHighestPricedRadio: false,
      reason: 'Required form control'
    };
  }

  const categorySignals = getCategory(candidate);

  if (
    categorySignals.category === null ||
    (!candidate.isRadio &&
      !candidate.hasPriceInLabel &&
      isSoleCheckboxInGroup(candidate) &&
      !categorySignals.isMarketing &&
      !categorySignals.isDonation &&
      !categorySignals.isDataSharing &&
      !categorySignals.isLegalConsent &&
      !categorySignals.isSubscription &&
      !categorySignals.isPersistentLogin)
  ) {
    return {
      ...candidate,
      classification: 'NEUTRAL',
      adjacency: 'ISOLATED',
      isHighestPricedRadio: false,
      reason: 'No optional paid, consent, subscription, donation, or sharing signal detected',
      ...categorySignals
    };
  }

  const highestPricedRadio = candidate.isRadio ? isHighestPricedRadio(candidate, doc) : false;

  if (candidate.isRadio && !highestPricedRadio) {
    return {
      ...candidate,
      classification: 'NEUTRAL',
      adjacency: 'ISOLATED',
      isHighestPricedRadio: false,
      reason: 'Radio selection is not the highest-priced option in its group',
      ...categorySignals
    };
  }

  const classified: ClassifiedInput = {
    ...candidate,
    classification: 'SUSPICIOUS',
    adjacency: isDecisionAdjacent(candidate, doc) ? 'DECISION_ADJACENT' : 'ISOLATED',
    isHighestPricedRadio: highestPricedRadio,
    reason: '',
    ...categorySignals
  };

  classified.reason = buildReason(classified);
  return classified;
}

/**
 * Determines whether a suspicious pre-selected input is adjacent to a purchase or submit decision point.
 */
export function isDecisionAdjacent(candidate: PreselectedInput, doc: Document = document): boolean {
  if (candidate.associatedForm !== null) {
    const submitButton = candidate.associatedForm.querySelector(FORM_SUBMIT_SELECTOR);

    if (submitButton instanceof HTMLElement) {
      return true;
    }
  }

  const candidateRect = getReferenceRect(candidate);

  if (candidateRect === null) {
    return false;
  }

  const decisionButtons = Array.from(doc.querySelectorAll<HTMLElement>(DECISION_BUTTON_SELECTOR)).filter((element) => {
    if (shouldExcludeElement(element) || !isVisibleElement(element)) {
      return false;
    }

    return includesAny(normalizeToken(getActionElementText(element)), DECISION_CTA_TERMS);
  });

  return decisionButtons.some((element) => getRectDistance(candidateRect, element.getBoundingClientRect()) <= PROXIMITY_THRESHOLD_PX);
}

/**
 * Runs the K-24 pre-selected optional-choice evaluation synchronously against the live document.
 */
export function evaluate(context: AnalysisContext): RuleResult {
  try {
    if (
      context.pageContext.type !== 'product' &&
      context.pageContext.type !== 'registration' &&
      context.pageContext.type !== 'account_settings' &&
      context.pageContext.type !== 'cart'
    ) {
      return createNotApplicableResult(RULE_ID);
    }

    if (!(document.body instanceof HTMLElement) || !hasAnyPreselectedInputs(document)) {
      return createNotApplicableResult(RULE_ID);
    }

    const candidates = findPreselectedInputs(document);
    const findings = candidates
      .map((candidate) => classifyInput(candidate, document))
      .filter((candidate): candidate is ClassifiedInput => candidate.classification === 'SUSPICIOUS');

    if (findings.length === 0) {
      return createRuleResult({
        ruleId: RULE_ID,
        detected: false,
        probability: 0,
        confidence: 'low',
        impact: 'low',
        visualTarget: buildVisualTarget([]),
        occurrenceCount: 0
      });
    }

    const scoreSummary = computeScore(findings);
    const evidence: RuleResult['evidence'] = findings.map((finding) => ({
      selector: finding.selector,
      text: finding.displayText,
      reason: finding.reason,
      boundingBox: getReferenceRect(finding)
    }));

    return createRuleResult({
      ruleId: RULE_ID,
      detected: scoreSummary.rawScore > 0,
      probability: getProbability(scoreSummary),
      confidence: getConfidence(scoreSummary),
      impact: getImpact(findings),
      evidence,
      visualTarget: buildVisualTarget(findings.map((finding) => finding.selector)),
      occurrenceCount: findings.length
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}

export const rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'registration', 'account_settings', 'cart'],
  detect(context: AnalysisContext): RuleResult {
    return evaluate(context);
  }
};

export default rule;
