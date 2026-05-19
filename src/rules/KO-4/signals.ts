import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import {
  CANDIDATE_SELECTOR,
  EMAIL_OR_USERNAME_PATTERN,
  MAX_PROBE_COUNT,
  PAYMENT_FIELD_PATTERN,
  SUPPLEMENTAL_ZONE_SELECTOR
} from './constants';
import { RuleCandidate, RuleZone } from './types';

function detectZone(element: HTMLElement): RuleZone {
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

export function collectCandidates(): RuleCandidate[] {
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

export function getFieldDescription(candidate: RuleCandidate): string {
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
