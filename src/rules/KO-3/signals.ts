import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import {
  DIRECT_BLOCKING_SELECTOR,
  MAX_CANDIDATES,
  MIN_TEXT_LENGTH,
  NAVIGATION_SELECTOR,
  SUPPLEMENTAL_ZONE_SELECTOR,
  TIER_1_SELECTOR,
  TIER_2_SELECTOR
} from './constants';
import { RuleCandidate, RuleZone } from './types';

function detectZone(element: HTMLElement): RuleZone {
  return element.closest(SUPPLEMENTAL_ZONE_SELECTOR) === null ? 'primary' : 'supplemental';
}

function getDomDepth(element: HTMLElement): number {
  let depth = 0;
  let current: HTMLElement | null = element.parentElement;

  while (current !== null) {
    depth += 1;
    current = current.parentElement;
  }

  return depth;
}

function isEligibleCandidate(element: HTMLElement, allowShortText = false): boolean {
  if (!element.isConnected) {
    return false;
  }

  if (element.closest(NAVIGATION_SELECTOR) !== null) {
    return false;
  }

  const textLength = (element.textContent ?? '').trim().length;

  if (allowShortText ? textLength === 0 : textLength < MIN_TEXT_LENGTH) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function compareCandidateElements(left: HTMLElement, right: HTMLElement): number {
  const depthDifference = getDomDepth(right) - getDomDepth(left);

  if (depthDifference !== 0) {
    return depthDifference;
  }

  const textLengthDifference = (left.textContent ?? '').trim().length - (right.textContent ?? '').trim().length;

  if (textLengthDifference !== 0) {
    return textLengthDifference;
  }

  const leftRect = left.getBoundingClientRect();
  const rightRect = right.getBoundingClientRect();
  return leftRect.width * leftRect.height - rightRect.width * rightRect.height;
}

function getDirectBlockingElements(): HTMLElement[] {
  return Array.from(document.querySelectorAll<HTMLElement>(DIRECT_BLOCKING_SELECTOR))
    .filter((element) => isEligibleCandidate(element, true))
    .sort(compareCandidateElements);
}

function isSelectionOverlapping(element: HTMLElement, selected: RuleCandidate[]): boolean {
  return selected.some(
    (candidate) =>
      candidate.element === element || candidate.element.contains(element) || element.contains(candidate.element)
  );
}

function createCandidate(element: HTMLElement): RuleCandidate {
  return {
    element,
    selector: generateUniqueSelector(element),
    text: normalizeWhitespace(element.textContent ?? '').slice(0, 80),
    zone: detectZone(element)
  };
}

function selectNonOverlappingCandidates(elements: HTMLElement[], selected: RuleCandidate[]): RuleCandidate[] {
  const nextSelected = [...selected];

  for (const element of elements) {
    if (isSelectionOverlapping(element, nextSelected)) {
      continue;
    }

    nextSelected.push(createCandidate(element));
  }

  return nextSelected;
}

export function collectCandidates(): RuleCandidate[] {
  const directBlockingCandidates = selectNonOverlappingCandidates(getDirectBlockingElements(), []);

  if (directBlockingCandidates.length >= MAX_CANDIDATES) {
    return directBlockingCandidates.slice(0, MAX_CANDIDATES);
  }

  const tier1Elements = Array.from(document.querySelectorAll<HTMLElement>(TIER_1_SELECTOR))
    .filter((element) => isEligibleCandidate(element))
    .sort(compareCandidateElements);
  const tier1Candidates = selectNonOverlappingCandidates(tier1Elements, directBlockingCandidates);

  if (tier1Candidates.length >= 5) {
    return tier1Candidates.slice(0, MAX_CANDIDATES);
  }

  const tier2Elements = Array.from(document.querySelectorAll<HTMLElement>(TIER_2_SELECTOR))
    .filter((element) => isEligibleCandidate(element))
    .sort(compareCandidateElements);
  return selectNonOverlappingCandidates(tier2Elements, tier1Candidates).slice(0, MAX_CANDIDATES);
}
