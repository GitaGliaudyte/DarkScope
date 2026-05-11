import { createNormalizedElement, isVisibleElement } from '../../engine/normalizedElements';
import { AnalysisContext, NormalizedElement, RuleResult } from '../../engine/types';
import { buildVisualTarget, clampProbability, createRuleResult } from '../../rules-utilities/resultUtils';
import { LIVE_TEXT_SELECTOR, RULE_ID, TIME_OF_DAY_CONTEXT, TIMER_IDENTIFIER_PATTERN, TIMER_TEXT_PATTERN } from './constants';
import { getConfidence, hasTimerAttribute, hasTimerClassOrId, includesUrgencyKeyword, scoreSignals } from './scoring';

interface CountdownHit {
  selector: string;
  element: HTMLElement;
  score: number;
  text: string;
  boundingBox: DOMRect | null;
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

export function detectCountdownTimer(context: AnalysisContext): RuleResult {
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
    !allHits.some(
      (other, otherIndex) =>
        otherIndex !== index && candidate.element !== other.element && candidate.element.contains(other.element)
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
    ruleId: RULE_ID,
    detected: evidence.length > 0,
    probability: clampProbability(highestScore / 10),
    confidence: getConfidence(highestScore),
    impact: 'medium',
    evidence,
    visualTarget: buildVisualTarget(Array.from(selectors))
  });
}
