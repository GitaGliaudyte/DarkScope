import { Confidence, NormalizedElement } from '../../engine/types';
import {
  FULL_TIMER_TEXT_PATTERN,
  MMSS_TIMER_TEXT_PATTERN,
  TIMER_ATTRIBUTES,
  TIMER_COMPONENT_PATTERN,
  TIMER_IDENTIFIER_PATTERN,
  URGENCY_KEYWORDS
} from './constants';

export function hasTimerAttribute(element: NormalizedElement): boolean {
  return TIMER_ATTRIBUTES.some((attribute) => element.attributes[attribute] !== undefined);
}

export function hasTimerClassOrId(element: NormalizedElement): boolean {
  const className = (element.attributes.class ?? '').toLowerCase();
  const id = (element.attributes.id ?? '').toLowerCase();
  const component = (element.attributes['data-component'] ?? '').toLowerCase();
  return (
    TIMER_IDENTIFIER_PATTERN.test(className) ||
    TIMER_IDENTIFIER_PATTERN.test(id) ||
    TIMER_COMPONENT_PATTERN.test(component)
  );
}

export function includesUrgencyKeyword(text: string): boolean {
  const normalized = text.toLowerCase();
  return URGENCY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function findNearbySplitCountdown(element: HTMLElement): boolean {
  const siblingTexts = Array.from(element.parentElement?.children ?? [])
    .map((sibling) => sibling.textContent?.trim() ?? '')
    .filter((text) => /^\d{1,2}$/.test(text));

  return siblingTexts.length >= 2;
}

export function scoreSignals(element: NormalizedElement, liveElement: HTMLElement, container: NormalizedElement): number {
  let score = 0;
  const elementText = element.text.toLowerCase();
  const containerText = container.text.toLowerCase();
  const classAndId = `${element.attributes.class ?? ''} ${element.attributes.id ?? ''}`.toLowerCase();

  if (hasTimerAttribute(element)) {
    score += 3;
  }

  if (FULL_TIMER_TEXT_PATTERN.test(element.text)) {
    score += 3;
  } else if (MMSS_TIMER_TEXT_PATTERN.test(element.text)) {
    score += 2;
  }

  if (includesUrgencyKeyword(containerText) || includesUrgencyKeyword(elementText)) {
    score += 2;
  }

  if (TIMER_IDENTIFIER_PATTERN.test(classAndId)) {
    score += 1;
  }

  if (findNearbySplitCountdown(liveElement)) {
    score += 1;
  }

  return score;
}

export function getConfidence(score: number): Confidence {
  if (score >= 6) {
    return 'high';
  }

  if (score >= 4) {
    return 'medium';
  }

  return 'low';
}
