import { Confidence, RuleResult } from '../../engine/types';
import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';

const MAX_PROBE_COUNT = 30;
const CANDIDATE_SELECTOR = [
  'input[type="text"]',
  'input[type="password"]',
  'input[type="email"]',
  'input[type="number"]',
  'input[type="tel"]',
  'input[type="search"]',
  'input:not([type])',
  'textarea',
  '[contenteditable="true"]'
].join(', ');
const SUPPLEMENTAL_ZONE_SELECTOR =
  'aside, footer, [class*=recommend], [class*=related], [class*=suggest], [class*=sidebar], [class*=upsell], [class*=widget]';
const PAYMENT_FIELD_PATTERN = /card|cvv|cvc|expir|pan|credit|debit|payment|cc-/i;
const EMAIL_OR_USERNAME_PATTERN = /email|user(name)?|login/i;
const INLINE_FALSE_HANDLER_PATTERN = /^\s*return\s+false\s*;?\s*$/i;

export type ElementZone = 'primary' | 'supplemental';
type BlockedEventType = 'paste' | 'copy';

export interface ProbeCandidate {
  element: HTMLElement;
  selector: string;
  label: string;
  priority: number;
  index: number;
  zone: ElementZone;
  passwordField: boolean;
  paymentField: boolean;
  emailOrUsernameField: boolean;
}

interface CandidateSignals {
  pasteBlocked: boolean;
  copyBlocked: boolean;
  inlineOnPasteBlocked: boolean;
  inlineOnCopyBlocked: boolean;
  autocompleteOff: boolean;
  dragFillBlocked: boolean;
}

export interface FlaggedElement extends ProbeCandidate {
  signals: CandidateSignals;
  score: number;
}

export function downgradeImpact(impact: RuleResult['impact']): RuleResult['impact'] {
  if (impact === 'high') {
    return 'medium';
  }

  if (impact === 'medium') {
    return 'low';
  }

  return 'low';
}

export function getConfidence(score: number): Confidence {
  if (score >= 8) {
    return 'high';
  }

  if (score >= 4) {
    return 'medium';
  }

  return 'low';
}

export function getProbability(score: number): number {
  if (score >= 8) {
    return 1;
  }

  if (score >= 4) {
    return 0.7;
  }

  if (score >= 1) {
    return 0.4;
  }

  return 0;
}

function detectZone(element: HTMLElement): ElementZone {
  return element.closest(SUPPLEMENTAL_ZONE_SELECTOR) === null ? 'primary' : 'supplemental';
}

function getFieldIdentifiers(element: HTMLElement): string {
  return [
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.getAttribute('autocomplete')
  ]
    .map((value) => normalizeWhitespace(value ?? '').toLowerCase())
    .filter((value) => value.length > 0)
    .join(' ');
}

function isPasswordField(element: HTMLElement): boolean {
  return element instanceof HTMLInputElement && element.type.toLowerCase() === 'password';
}

function isPaymentField(element: HTMLElement): boolean {
  return PAYMENT_FIELD_PATTERN.test(getFieldIdentifiers(element));
}

function isEmailOrUsernameField(element: HTMLElement): boolean {
  if (element instanceof HTMLInputElement && element.type.toLowerCase() === 'email') {
    return true;
  }

  return EMAIL_OR_USERNAME_PATTERN.test(getFieldIdentifiers(element));
}

function isCandidateVisible(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return element.offsetParent !== null && rect.width > 0 && rect.height > 0;
}

function isCandidateEligible(element: HTMLElement): boolean {
  if (
    (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) &&
    (element.disabled || element.readOnly)
  ) {
    return false;
  }

  if (element.hasAttribute('disabled') || element.hasAttribute('readonly')) {
    return false;
  }

  return isCandidateVisible(element);
}

function getCandidatePriority(element: HTMLElement): number {
  if (isPasswordField(element) || isPaymentField(element)) {
    return 0;
  }

  if (isEmailOrUsernameField(element)) {
    return 1;
  }

  return 2;
}

function getEvidenceText(element: HTMLElement): string {
  const preferredText = [
    element.getAttribute('name'),
    element.getAttribute('id'),
    element.getAttribute('placeholder'),
    element.getAttribute('aria-label')
  ]
    .map((value) => normalizeWhitespace(value ?? ''))
    .find((value) => value.length > 0);

  if (preferredText !== undefined) {
    return preferredText.slice(0, 80);
  }

  const tag = element.tagName.toLowerCase();

  if (element instanceof HTMLInputElement) {
    const type = normalizeWhitespace(element.getAttribute('type') ?? '');
    return type.length > 0 ? `${tag}[type=${type}]` : tag;
  }

  if (element instanceof HTMLTextAreaElement) {
    return 'textarea';
  }

  return `${tag}[contenteditable=true]`;
}

export function collectCandidates(): ProbeCandidate[] {
  return Array.from(document.querySelectorAll<HTMLElement>(CANDIDATE_SELECTOR))
    .filter((element) => element.isConnected)
    .filter(isCandidateEligible)
    .map((element, index) => ({
      element,
      selector: generateUniqueSelector(element),
      label: getEvidenceText(element),
      priority: getCandidatePriority(element),
      index,
      zone: detectZone(element),
      passwordField: isPasswordField(element),
      paymentField: isPaymentField(element),
      emailOrUsernameField: isEmailOrUsernameField(element)
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.index - right.index;
    })
    .slice(0, MAX_PROBE_COUNT);
}

function isEventBlocked(element: HTMLElement, eventType: BlockedEventType): boolean {
  const event = new ClipboardEvent(eventType, {
    bubbles: true,
    cancelable: true,
    composed: true
  });

  element.dispatchEvent(event);
  return event.defaultPrevented;
}

function hasInlineFalseHandler(element: HTMLElement, attributeName: 'onpaste' | 'oncopy' | 'ondrop'): boolean {
  return INLINE_FALSE_HANDLER_PATTERN.test(element.getAttribute(attributeName) ?? '');
}

export function probeCandidate(candidate: ProbeCandidate): FlaggedElement | null {
  candidate.element.focus();

  const pasteBlocked = isEventBlocked(candidate.element, 'paste');
  const copyBlocked = isEventBlocked(candidate.element, 'copy');
  const inlineOnPasteBlocked = hasInlineFalseHandler(candidate.element, 'onpaste');
  const inlineOnCopyBlocked = hasInlineFalseHandler(candidate.element, 'oncopy');
  const autocompleteOff =
    (candidate.passwordField || candidate.paymentField) &&
    normalizeWhitespace(candidate.element.getAttribute('autocomplete') ?? '').toLowerCase() === 'off';
  const dragFillBlocked =
    candidate.element instanceof HTMLInputElement &&
    (hasInlineFalseHandler(candidate.element, 'ondrop') ||
      normalizeWhitespace(candidate.element.getAttribute('draggable') ?? '').toLowerCase() === 'false');

  const signals: CandidateSignals = {
    pasteBlocked,
    copyBlocked,
    inlineOnPasteBlocked,
    inlineOnCopyBlocked,
    autocompleteOff,
    dragFillBlocked
  };

  const hasFlaggingSignal =
    pasteBlocked || copyBlocked || inlineOnPasteBlocked || inlineOnCopyBlocked || dragFillBlocked;

  if (!hasFlaggingSignal) {
    return null;
  }

  let score = 0;

  if (pasteBlocked) {
    score += 3;
  }

  if (copyBlocked) {
    score += 2;
  }

  if (inlineOnPasteBlocked) {
    score += 2;
  }

  if (inlineOnCopyBlocked) {
    score += 1;
  }

  if (autocompleteOff) {
    score += 1;
  }

  if (dragFillBlocked) {
    score += 1;
  }

  return {
    ...candidate,
    signals,
    score
  };
}

export function getFieldDescription(candidate: ProbeCandidate): string {
  if (candidate.passwordField) {
    return 'password field';
  }

  if (candidate.paymentField) {
    return 'payment field';
  }

  if (candidate.emailOrUsernameField) {
    return 'email or username field';
  }

  if (candidate.element instanceof HTMLTextAreaElement) {
    return 'textarea';
  }

  if (candidate.element.isContentEditable) {
    return 'editable region';
  }

  return 'input field';
}

export function getBaseImpact(candidate: ProbeCandidate): RuleResult['impact'] {
  return candidate.passwordField || candidate.paymentField ? 'high' : 'medium';
}

export function buildReason(candidate: FlaggedElement): string {
  const reasonParts: string[] = [];

  if (candidate.signals.pasteBlocked && candidate.signals.copyBlocked) {
    reasonParts.push(`Copy and paste blocked on ${getFieldDescription(candidate)}`);
  } else if (candidate.signals.pasteBlocked) {
    reasonParts.push(`Paste blocked on ${getFieldDescription(candidate)}`);
  } else if (candidate.signals.copyBlocked) {
    reasonParts.push(`Copy blocked on ${getFieldDescription(candidate)}`);
  }

  if (candidate.signals.inlineOnPasteBlocked) {
    reasonParts.push('Inline onpaste handler suppresses paste');
  }

  if (candidate.signals.inlineOnCopyBlocked) {
    reasonParts.push('Inline oncopy handler suppresses copy');
  }

  if (candidate.signals.dragFillBlocked) {
    reasonParts.push('Drag-to-fill disabled on field');
  }

  if (candidate.signals.autocompleteOff) {
    reasonParts.push('Autocomplete disabled on password or payment field');
  }

  if (reasonParts.length === 0) {
    reasonParts.push(`Clipboard interaction blocked on ${getFieldDescription(candidate)}`);
  }

  return reasonParts.join('; ');
}
