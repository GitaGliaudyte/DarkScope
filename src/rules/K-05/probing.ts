import { INLINE_FALSE_HANDLER_PATTERN, INLINE_USER_SELECT_NONE_PATTERN } from './constants';
import { CandidateSignals, FlaggedElement, ProbeCandidate } from './types';

function isCopyEventBlocked(element: HTMLElement): boolean {
  const event = new ClipboardEvent('copy', {
    bubbles: true,
    cancelable: true,
    composed: true
  });

  element.dispatchEvent(event);
  return event.defaultPrevented;
}

function isCssSelectionBlocked(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);

  return (
    style.userSelect === 'none' ||
    (style as CSSStyleDeclaration & { webkitUserSelect?: string }).webkitUserSelect === 'none'
  );
}

function hasInlineFalseHandler(element: HTMLElement, attributeName: 'oncopy' | 'onselectstart'): boolean {
  return INLINE_FALSE_HANDLER_PATTERN.test(element.getAttribute(attributeName) ?? '');
}

function hasInlineSelectionStyle(element: HTMLElement): boolean {
  return INLINE_USER_SELECT_NONE_PATTERN.test((element.getAttribute('style') ?? '').toLowerCase());
}

function getCandidateSignals(element: HTMLElement): CandidateSignals {
  return {
    copyEventBlocked: isCopyEventBlocked(element),
    cssSelectionBlocked: isCssSelectionBlocked(element),
    inlineOnCopyBlocked: hasInlineFalseHandler(element, 'oncopy'),
    inlineOnSelectStartBlocked: hasInlineFalseHandler(element, 'onselectstart'),
    inlineStyleSelectionBlocked: hasInlineSelectionStyle(element)
  };
}

function getSignalScore(signals: CandidateSignals): number {
  let score = 0;

  if (signals.copyEventBlocked) {
    score += 3;
  }

  if (signals.cssSelectionBlocked) {
    score += 3;
  }

  if (signals.inlineOnCopyBlocked) {
    score += 2;
  }

  if (signals.inlineOnSelectStartBlocked) {
    score += 2;
  }

  if (signals.inlineStyleSelectionBlocked) {
    score += 1;
  }

  return score;
}

export function probeCandidate(candidate: ProbeCandidate): FlaggedElement | null {
  const signals = getCandidateSignals(candidate.element);
  const score = getSignalScore(signals);

  if (score === 0) {
    return null;
  }

  return {
    ...candidate,
    signals,
    score
  };
}
