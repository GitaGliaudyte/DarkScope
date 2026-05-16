import { createNormalizedElement, isVisibleElement } from '../../engine/normalizedElements';
import { AnalysisContext, NormalizedElement, RuleResult } from '../../engine/types';
import { buildVisualTarget, clampProbability, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID, CHECKBOX_SELECTORS } from './constants';
import { getCheckboxLabelText, getConfidence, isExcludedContext, scoreSignals } from './scoring';

interface CheckboxHit {
  selector: string;
  element: HTMLElement;
  score: number;
  text: string;
  boundingBox: DOMRect | null;
}

function isCheckboxCandidate(element: NormalizedElement): boolean {
  const tagName = element.attributes.tagName?.toLowerCase();
  const inputType = element.attributes.type?.toLowerCase();
  const classAndId = `${element.attributes.class ?? ''} ${element.attributes.id ?? ''}`.toLowerCase();
  const role = (element.attributes.role ?? '').toLowerCase();
  
  return (tagName === 'input' && inputType === 'checkbox') ||
         role === 'checkbox' ||
         classAndId.includes('checkbox') ||
         element.attributes['aria-checked'] !== undefined;
}

export function findCheckboxCandidates(snapshot: AnalysisContext['snapshot']): NormalizedElement[] {
  const snapshotCandidates = snapshot.elements.filter(isCheckboxCandidate);

  const liveCandidates = Array.from(document.querySelectorAll<HTMLElement>(CHECKBOX_SELECTORS.join(', ')))
    .filter((element) => element.isConnected && isVisibleElement(element))
    .map((element) => createNormalizedElement(element));

  const merged = [...snapshotCandidates, ...liveCandidates];
  return Array.from(new Map(merged.map((candidate) => [candidate.selector, candidate])).values());
}

export function detectPreCheckedCheckboxes(context: AnalysisContext): RuleResult {
  const candidates = findCheckboxCandidates(context.snapshot);
  const evidence: RuleResult['evidence'] = [];
  const selectors = new Set<string>();
  let highestScore = 0;
  const hits: CheckboxHit[] = [];

  for (const candidate of candidates) {
    const liveElement = document.querySelector<HTMLElement>(candidate.selector);

    if (liveElement === null || !liveElement.isConnected || !isVisibleElement(liveElement)) {
      continue;
    }

    if (isExcludedContext(liveElement)) {
      continue;
    }

    const score = scoreSignals(candidate, liveElement);

    if (score > 0) {
      const labelText = getCheckboxLabelText(liveElement);
      hits.push({
        selector: candidate.selector,
        element: liveElement,
        score,
        text: labelText.slice(0, 200),
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
      reason: `Pre-checked newsletter/marketing checkbox detected with score ${hit.score}/10`,
      boundingBox: hit.boundingBox
    });
  }

  return createRuleResult({
    ruleId: RULE_ID,
    detected: evidence.length > 0,
    probability: clampProbability(highestScore / 10),
    confidence: getConfidence(highestScore),
    impact: 'high',
    evidence,
    visualTarget: buildVisualTarget(Array.from(selectors))
  });
}
