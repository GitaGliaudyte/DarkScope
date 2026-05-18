import { normalizeWhitespace } from '../../engine/normalizedElements';
import { INLINE_FALSE_HANDLER_PATTERN } from './constants';
import { RuleCandidate, RuleFinding, RuleSignals } from './types';

type BlockedEventType = 'paste' | 'copy';

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

export function probeCandidate(candidate: RuleCandidate): RuleFinding | null {
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

  const signals: RuleSignals = {
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
