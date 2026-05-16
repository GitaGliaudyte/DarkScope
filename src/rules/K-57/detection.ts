import {
  createNormalizedElement,
  isVisibleElement,
  generateUniqueSelector
} from '../../engine/normalizedElements';
import {
  AnalysisContext,
  NormalizedElement,
  RuleResult
} from '../../engine/types';
import {
  buildVisualTarget,
  clampProbability,
  createRuleResult
} from '../../rules-utilities/resultUtils';
import {
  REVIEW_CONTAINER_SELECTORS,
  REVIEW_TEXT_SELECTORS,
  RULE_ID,
  MIN_REVIEW_TEXT_LENGTH
} from './constants';
import { getConfidence, scoreReviewContainer } from './scoring';

function isReviewLikeElement(element: NormalizedElement): boolean {
  const classAndId = `${element.attributes.class ?? ''} ${
    element.attributes.id ?? ''
  }`.toLowerCase();

  return (
    classAndId.includes('review') ||
    classAndId.includes('rating') ||
    classAndId.includes('testimonial') ||
    classAndId.includes('feedback')
  );
}

export function findReviewContainers(
  snapshot: AnalysisContext['snapshot']
): NormalizedElement[] {
  const snapshotCandidates = snapshot.elements.filter(isReviewLikeElement);

  const liveCandidates = Array.from(
    document.querySelectorAll<HTMLElement>(
      REVIEW_CONTAINER_SELECTORS.join(', ')
    )
  )
    .filter((el) => el.isConnected && isVisibleElement(el))
    .map((el) => createNormalizedElement(el));

  const merged = [...snapshotCandidates, ...liveCandidates];

  return Array.from(new Map(merged.map((c) => [c.selector, c])).values());
}

function isMetaReviewText(text: string): boolean {
  const t = text.toLowerCase();

  return (
    t.includes('viewing') ||
    t.includes('showing') ||
    (t.includes('of') && /\d/.test(t) && t.includes('reviews')) ||
    t.includes('filter') ||
    t.includes('sort') ||
    t.includes('results') ||
    t.includes('load more') ||
    t.includes('write a review') ||
    t.includes('search reviews')
  );
}

function findReviewTextElements(container: HTMLElement): HTMLElement[] {
  return Array.from(
    container.querySelectorAll<HTMLElement>(
      REVIEW_TEXT_SELECTORS.join(', ')
    )
  ).filter((el) => {
    const text = el.textContent?.trim() ?? '';

    if (text.length < MIN_REVIEW_TEXT_LENGTH) return false;
    if (isMetaReviewText(text)) return false;

    return true;
  });
}

export function detectReviewIssues(
  context: AnalysisContext
): RuleResult {
  const containers = findReviewContainers(context.snapshot);

  const evidence: RuleResult['evidence'] = [];
  const selectors = new Set<string>();
  let highestScore = 0;
  let occurrenceCount = 0;

  for (const container of containers) {
    const liveEl = document.querySelector<HTMLElement>(container.selector);
    if (!liveEl || !liveEl.isConnected || !isVisibleElement(liveEl)) continue;

    const closestEl = liveEl.closest('li.review');
    const reviewRoot = closestEl instanceof HTMLElement ? closestEl : liveEl;

    const textElements = findReviewTextElements(reviewRoot);
    if (textElements.length === 0) continue;

    const score = scoreReviewContainer(reviewRoot);
    if (score <= 0) continue;

    highestScore = Math.max(highestScore, score);
    occurrenceCount += textElements.length;

    for (const textEl of textElements) {
      const sel = generateUniqueSelector(textEl);

      selectors.add(sel);
      evidence.push({
        selector: sel,
        text: textEl.textContent?.trim().slice(0, 200) ?? '',
        reason: `Review authenticity risk score: ${score}/10`,
        boundingBox: reviewRoot.getBoundingClientRect()
      });
    }
  }

  return createRuleResult({
    ruleId: RULE_ID,
    detected: evidence.length > 0,
    probability: clampProbability(highestScore / 10),
    confidence: getConfidence(highestScore),
    impact: 'medium',
    evidence,
    visualTarget: buildVisualTarget(Array.from(selectors)),
    occurrenceCount
  });
}
