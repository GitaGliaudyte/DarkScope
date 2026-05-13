import { createNormalizedElement, isVisibleElement } from '../../engine/normalizedElements';
import { AnalysisContext, NormalizedElement, RuleResult } from '../../engine/types';
import { buildVisualTarget, clampProbability, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { getConfidence, scoreAutoplay } from './scoring';

interface AutoplayHit {
  selector: string;
  element: HTMLElement;
  boundingBox: DOMRect | null;
  score: number;
  text: string;
}

function isMedia(element: NormalizedElement): boolean {
  const tag = element.tag.toLowerCase();
  return tag === 'video' || tag === 'audio' || tag === 'iframe';
}

export function detectAutoplay(context: AnalysisContext): RuleResult {
  const snapshotCandidates = context.snapshot.elements.filter(isMedia);

  const liveCandidates = Array.from(document.querySelectorAll<HTMLElement>('video, audio, iframe'))
    .filter((el) => el.isConnected && isVisibleElement(el))
    .map((el) => createNormalizedElement(el));

  const merged = [...snapshotCandidates, ...liveCandidates];
  const candidates = Array.from(new Map(merged.map((c) => [c.selector, c])).values());

  const hits: AutoplayHit[] = [];
  let highestScore = 0;

  for (const candidate of candidates) {
    const live = document.querySelector<HTMLElement>(candidate.selector);
    if (!live || !isVisibleElement(live)) continue;

    const score = scoreAutoplay(live);
    if (score <= 0) continue;

    highestScore = Math.max(highestScore, score);

    hits.push({
      selector: candidate.selector,
      element: live,
      boundingBox: live.getBoundingClientRect(),
      score,
      text: candidate.text.slice(0, 200)
    });
  }

  if (hits.length === 0) {
    return createRuleResult({
      ruleId: RULE_ID,
      detected: false,
      probability: 0,
      confidence: 'low',
      impact: 'medium',
      evidence: [],
      visualTarget: buildVisualTarget([])
    });
  }

  const evidence = hits.map((hit) => ({
    selector: hit.selector,
    text: hit.text,
    reason: `Autoplay detected (score ${hit.score}/10)`,
    boundingBox: hit.boundingBox
  }));

  const selectors = hits.map((h) => h.selector);

  return createRuleResult({
    ruleId: RULE_ID,
    detected: true,
    probability: clampProbability(highestScore / 10),
    confidence: getConfidence(highestScore),
    impact: 'medium',
    evidence,
    visualTarget: buildVisualTarget(selectors)
  });
}
