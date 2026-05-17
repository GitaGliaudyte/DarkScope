import { createNormalizedElement, isVisibleElement } from '../../engine/normalizedElements';
import { AnalysisContext, NormalizedElement, RuleResult } from '../../engine/types';
import { buildVisualTarget, clampProbability, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID, POPUP_CONTAINER_SELECTORS } from './constants';
import { getConfidence, isRealVisiblePopup, scoreSignals } from './scoring';

interface PopupHit {
  selector: string;
  element: HTMLElement;
  score: number;
  text: string;
  boundingBox: DOMRect | null;
}

function isPopupCandidate(element: NormalizedElement): boolean {
  const classAndId = `${element.attributes.class ?? ''} ${element.attributes.id ?? ''}`.toLowerCase();
  const role = (element.attributes.role ?? '').toLowerCase();
  const ariaModal = (element.attributes['aria-modal'] ?? '').toLowerCase();
  const dataRole = (element.attributes['data-role'] ?? '').toLowerCase();
  
  const hasModalIndicator = 
    classAndId.includes('modal-content') ||
    classAndId.includes('modal') ||
    classAndId.includes('popup') ||
    classAndId.includes('overlay') ||
    classAndId.includes('newsletterpopup') ||
    role === 'dialog' ||
    ariaModal === 'true' ||
    dataRole === 'content';
  
  const isNestedElement = 
    classAndId.includes('input') ||
    classAndId.includes('button') ||
    classAndId.includes('form') ||
    classAndId.includes('field') ||
    element.attributes.tagName === 'INPUT' ||
    element.attributes.tagName === 'BUTTON' ||
    element.attributes.tagName === 'FORM';
  
  return hasModalIndicator && !isNestedElement;
}

export function findPopupCandidates(snapshot: AnalysisContext['snapshot']): NormalizedElement[] {
  const snapshotCandidates = snapshot.elements.filter(isPopupCandidate);

  const liveCandidates = Array.from(document.querySelectorAll<HTMLElement>(POPUP_CONTAINER_SELECTORS.join(', ')))
    .filter((element) => element.isConnected && isVisibleElement(element))
    .filter((element) => {
      const classAndId = `${element.className} ${element.id}`.toLowerCase();
      const isNestedElement = 
        classAndId.includes('input') ||
        classAndId.includes('button') ||
        classAndId.includes('form') ||
        classAndId.includes('field') ||
        element.tagName === 'INPUT' ||
        element.tagName === 'BUTTON' ||
        element.tagName === 'FORM';
      
      return !isNestedElement;
    })
    .map((element) => createNormalizedElement(element))
    .filter((element) => isPopupCandidate(element));

  const merged = [...snapshotCandidates, ...liveCandidates];
  return Array.from(new Map(merged.map((candidate) => [candidate.selector, candidate])).values());
}

export function detectAutomaticPopups(context: AnalysisContext): RuleResult {
  const candidates = findPopupCandidates(context.snapshot);
  const evidence: RuleResult['evidence'] = [];
  const selectors = new Set<string>();
  let highestScore = 0;
  const hits: PopupHit[] = [];

  for (const candidate of candidates) {
    const liveElement = document.querySelector<HTMLElement>(candidate.selector);

    if (liveElement === null || !liveElement.isConnected || !isVisibleElement(liveElement)) {
      continue;
    }

    if (!isRealVisiblePopup(liveElement)) {
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
      reason: `Automatic popup detected with score ${hit.score}/10`,
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