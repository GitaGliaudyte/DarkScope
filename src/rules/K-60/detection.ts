import { createNormalizedElement, isVisibleElement } from '../../engine/normalizedElements';
import { AnalysisContext, NormalizedElement, RuleResult } from '../../engine/types';
import { buildVisualTarget, clampProbability, createRuleResult } from '../../rules-utilities/resultUtils';
import { LIVE_TEXT_SELECTOR, RULE_ID } from './constants';
import { getConfidence, matchesLimitedTimePattern, scoreSignals } from './scoring';

interface LimitedTimeHit {
  selector: string;
  element: HTMLElement;
  score: number;
  text: string;
  boundingBox: DOMRect | null;
}

function isLimitedTimeCandidate(element: NormalizedElement): boolean {
  return matchesLimitedTimePattern(element.text);
}

export function findLimitedTimeCandidates(snapshot: AnalysisContext['snapshot']): NormalizedElement[] {
  const snapshotCandidates = snapshot.elements.filter(isLimitedTimeCandidate);
  const liveTextCandidates = Array.from(document.querySelectorAll<HTMLElement>(LIVE_TEXT_SELECTOR))
    .filter((element) => element.isConnected && isVisibleElement(element))
    .map((element) => createNormalizedElement(element))
    .filter((element) => element.text.length > 0)
    .filter((element) => matchesLimitedTimePattern(element.text));

  const merged = [...snapshotCandidates, ...liveTextCandidates];
  return Array.from(new Map(merged.map((candidate) => [candidate.selector, candidate])).values());
}

export function detectLimitedTime(context: AnalysisContext): RuleResult {
  const candidates = findLimitedTimeCandidates(context.snapshot);
  const evidence: RuleResult['evidence'] = [];
  const selectors = new Set<string>();
  let highestScore = 0;
  const hits: LimitedTimeHit[] = [];

  for (const candidate of candidates) {
    const liveElement = document.querySelector<HTMLElement>(candidate.selector);

    if (liveElement === null || !liveElement.isConnected || !isVisibleElement(liveElement)) {
      continue;
    }

    const score = scoreSignals(candidate, liveElement);

    if (score > 0) {
      hits.push({
        selector: candidate.selector,
        element: liveElement,
        score,
        text: candidate.text.slice(0, 200),
        boundingBox: liveElement.getBoundingClientRect()
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
      reason: `Limited-time offer signal scored ${hit.score}/10`,
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
