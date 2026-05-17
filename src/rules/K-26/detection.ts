import { isVisibleElement } from '../../engine/normalizedElements';
import { AnalysisContext, NormalizedElement, RuleResult } from '../../engine/types';
import { buildVisualTarget, clampProbability, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { getConfidence, scoreSignals, hasAvatar, hasEmojis, hasEmotionalWords, isExcludedContext } from './scoring';

interface AnthropomorphicHit {
  selector: string;
  element: HTMLElement;
  score: number;
  text: string;
  boundingBox: DOMRect | null;
  features: string[];
}

export function detectChatbotElements(context: AnalysisContext): RuleResult {
  const hits: AnthropomorphicHit[] = [];
  const selectors = new Set<string>();

  for (const element of context.snapshot.elements) {
    if (element.visible === false) {
      continue;
    }

    const liveElement = document.querySelector(element.selector) as HTMLElement;
    if (!liveElement || !isVisibleElement(liveElement) || isExcludedContext(liveElement)) {
      continue;
    }

    const score = scoreSignals(element, liveElement);
    if (score >= 3) {
      const detectedFeatures: string[] = [];
      if (hasAvatar(liveElement)) detectedFeatures.push('avatar');
      if (hasEmojis(liveElement)) detectedFeatures.push('uses emojis');
      if (hasEmotionalWords(liveElement)) detectedFeatures.push('emotional words');

      hits.push({
        selector: element.selector,
        element: liveElement,
        score: score,
        text: element.text || '',
        boundingBox: liveElement.getBoundingClientRect(),
        features: detectedFeatures
      });
      selectors.add(element.selector);
    }
  }

  if (hits.length === 0) {
    return createRuleResult({
      ruleId: RULE_ID,
      detected: false,
      probability: 0,
      confidence: 'low',
      impact: 'low',
      evidence: [
        {
          selector: 'body',
          text: '',
          reason: 'No elements containing avatars, emojis, or emotional words were detected.',
          boundingBox: null
        }
      ],
      visualTarget: buildVisualTarget([]),
      occurrenceCount: 0
    });
  }

  const topHit = hits.reduce((max, current) => (current.score > max.score ? current : max), hits[0]);

  const evidence = hits.map((hit) => ({
    selector: hit.selector,
    text: hit.text.slice(0, 200),
    reason: `Target element contains anthropomorphic features: ${hit.features.join(', ')}.`,
    boundingBox: hit.boundingBox
  }));

  return createRuleResult({
    ruleId: RULE_ID,
    detected: true,
    probability: clampProbability(topHit.score / 10),
    confidence: getConfidence(topHit.score),
    impact: 'low',
    evidence,
    visualTarget: buildVisualTarget(Array.from(selectors)),
    occurrenceCount: hits.length
  });
}