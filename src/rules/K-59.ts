// This file detects countdown timer dark patterns using DOM-only heuristics and page text signals.
import { defaultPageClassifier } from '../engine/pageClassifier';
import { createNormalizedElement, isVisibleElement } from '../engine/normalizedElements';
import { AnalysisContext, Confidence, NormalizedElement, RuleDefinition, RuleResult } from '../engine/types';
import { buildVisualTarget, clampProbability, createRuleResult } from '../rules-utilities/resultUtils';

const TIMER_ATTRIBUTES = ['data-countdown', 'data-timer', 'data-end-time', 'data-target-time'] as const;
const LIVE_TEXT_SELECTOR = 'span, div, p, small, strong, b, em, li';
const TIMER_TEXT_PATTERN = /\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/;
const FULL_TIMER_TEXT_PATTERN = /\b\d{1,2}:\d{2}:\d{2}\b/;
const MMSS_TIMER_TEXT_PATTERN = /\b\d{1,2}:\d{2}\b/;
const TIMER_IDENTIFIER_PATTERN = /countdown|timer|clock/;
const TIMER_COMPONENT_PATTERN = /countdown|timer/;
const URGENCY_KEYWORDS = [
  'ends in',
  'limited time',
  'expires',
  'only left',
  'hurry',
  'offer ends',
  'sale ends',
  'today only',
  'last chance',
  'limited time deal',
  'limited time offer'
];
const TIME_OF_DAY_CONTEXT = ['opening hours', 'schedule', 'timetable'];

interface CountdownHit {
  selector: string;
  element: HTMLElement;
  score: number;
  text: string;
  boundingBox: DOMRect | null;
}

function hasTimerAttribute(element: NormalizedElement): boolean {
  return TIMER_ATTRIBUTES.some((attribute) => element.attributes[attribute] !== undefined);
}

function hasTimerClassOrId(element: NormalizedElement): boolean {
  const className = (element.attributes.class ?? '').toLowerCase();
  const id = (element.attributes.id ?? '').toLowerCase();
  const component = (element.attributes['data-component'] ?? '').toLowerCase();
  return TIMER_IDENTIFIER_PATTERN.test(className) || TIMER_IDENTIFIER_PATTERN.test(id) || TIMER_COMPONENT_PATTERN.test(component);
}

function includesUrgencyKeyword(text: string): boolean {
  const normalized = text.toLowerCase();
  return URGENCY_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function findNearbySplitCountdown(element: HTMLElement): boolean {
  const siblingTexts = Array.from(element.parentElement?.children ?? [])
    .map((sibling) => sibling.textContent?.trim() ?? '')
    .filter((text) => /^\d{1,2}$/.test(text));

  return siblingTexts.length >= 2;
}

function isCountdownCandidate(element: NormalizedElement): boolean {
  const joinedAttributes = Object.entries(element.attributes)
    .map(([name, value]) => `${name}=${value}`)
    .join(' ')
    .toLowerCase();

  return (
    hasTimerAttribute(element) ||
    TIMER_TEXT_PATTERN.test(element.text) ||
    hasTimerClassOrId(element) ||
    TIMER_IDENTIFIER_PATTERN.test(joinedAttributes) ||
    includesUrgencyKeyword(element.text)
  );
}

export function findCountdownCandidates(snapshot: AnalysisContext['snapshot']): NormalizedElement[] {
  const snapshotCandidates = snapshot.elements.filter(isCountdownCandidate);
  const liveTextCandidates = Array.from(document.querySelectorAll<HTMLElement>(LIVE_TEXT_SELECTOR))
    .filter((element) => element.isConnected && isVisibleElement(element))
    .map((element) => createNormalizedElement(element))
    .filter((element) => element.text.length > 0)
    .filter((element) => includesUrgencyKeyword(element.text) || TIMER_TEXT_PATTERN.test(element.text));

  const merged = [...snapshotCandidates, ...liveTextCandidates];
  return Array.from(new Map(merged.map((candidate) => [candidate.selector, candidate])).values());
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

function isMeaningfulContainer(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  const className = typeof element.className === 'string' ? element.className.trim() : '';
  const hasMeaningfulIdentity = element.id.length > 0 || className.length > 0;
  return tag === 'section' || tag === 'article' || tag === 'aside' || (tag === 'div' && hasMeaningfulIdentity);
}

export function findContainer(liveElement: HTMLElement, snapshot: AnalysisContext['snapshot']): NormalizedElement {
  let current: HTMLElement | null = liveElement;

  while (current !== null) {
    if (isMeaningfulContainer(current)) {
      const normalizedCurrent = createNormalizedElement(current);
      const matched = snapshot.elements.find((candidate) => candidate.selector === normalizedCurrent.selector);

      if (matched !== undefined) {
        return matched;
      }

      if (current === liveElement) {
        return createNormalizedElement(liveElement);
      }

      const explicitSelector =
        current.id.length > 0
          ? `${current.tagName.toLowerCase()}#${CSS.escape(current.id)}`
          : current.className.trim().length > 0
            ? `${current.tagName.toLowerCase()}.${CSS.escape(current.className.trim().split(/\s+/)[0])}`
            : '';

      if (explicitSelector.length > 0) {
        return {
          selector: explicitSelector,
          tag: current.tagName.toLowerCase(),
          text: normalizedCurrent.text,
          attributes: normalizedCurrent.attributes,
          visible: normalizedCurrent.visible,
          boundingBox: normalizedCurrent.boundingBox
        };
      }
    }

    current = current.parentElement;
  }

  return createNormalizedElement(liveElement);
}

const K59Rule: RuleDefinition = {
  id: 'K-59',
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'cart', 'checkout'],
  detect(context: AnalysisContext): RuleResult {
    const candidates = findCountdownCandidates(context.snapshot);
    const evidence: RuleResult['evidence'] = [];
    const selectors = new Set<string>();
    let highestScore = 0;
    const hits: CountdownHit[] = [];

    for (const candidate of candidates) {
      const liveElement = document.querySelector<HTMLElement>(candidate.selector);

      if (liveElement === null || !liveElement.isConnected || !isVisibleElement(liveElement)) {
        continue;
      }

      const container = findContainer(liveElement, context.snapshot);
      const score = scoreSignals(candidate, liveElement, container);
      const nearbyText = `${candidate.text} ${container.text}`.toLowerCase();

      if (score < 2 && TIME_OF_DAY_CONTEXT.some((phrase) => nearbyText.includes(phrase))) {
        continue;
      }

      if (score >= 3) {
        hits.push({
          selector: candidate.selector,
          element: liveElement,
          score,
          text: candidate.text.slice(0, 200),
          boundingBox: candidate.boundingBox
        });
      }
    }

    const prunedHits = hits.filter((candidate, index, allHits) =>
      !allHits.some((other, otherIndex) =>
        otherIndex !== index &&
        candidate.element !== other.element &&
        candidate.element.contains(other.element)
      )
    );

    for (const hit of prunedHits) {
      highestScore = Math.max(highestScore, hit.score);
      selectors.add(hit.selector);
      evidence.push({
        selector: hit.selector,
        text: hit.text,
        reason: `Countdown timer signals scored ${hit.score}/10`,
        boundingBox: hit.boundingBox
      });
    }

    return createRuleResult({
      ruleId: 'K-59',
      detected: evidence.length > 0,
      probability: clampProbability(highestScore / 10),
      confidence: getConfidence(highestScore),
      impact: 'medium',
      evidence,
      visualTarget: buildVisualTarget(Array.from(selectors))
    });
  }
};

export default K59Rule;
