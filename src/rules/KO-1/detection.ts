import { generateUniqueSelector } from '../../engine/normalizedElements';
import { AnalysisContext, RuleResult } from '../../engine/types';
import { buildVisualTarget, clampProbability, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { getConfidence, scoreSignals } from './scoring';
import { findDeletionCandidates, getEvidenceText, getInteractiveElementCount, getSummaryHeadingText } from './signals';

export function detectDeletionAccessibility(context: AnalysisContext): RuleResult {
  const { deletionSignals, hiddenSignals } = findDeletionCandidates();
  const visibleDeletion = deletionSignals.filter((signal) => signal.visible);

  if (visibleDeletion.length > 0) {
    const firstVisible = visibleDeletion[0];

    return createRuleResult({
      ruleId: RULE_ID,
      detected: false,
      probability: 0,
      confidence: 'low',
      impact: 'high',
      evidence: [
        {
          selector: firstVisible.selector,
          text: firstVisible.text.slice(0, 200),
          reason: 'Account deletion control found and accessible.',
          boundingBox:
            firstVisible.element instanceof HTMLElement ? firstVisible.element.getBoundingClientRect() : null
        }
      ],
      visualTarget: buildVisualTarget([]),
      occurrenceCount: 1
    });
  }

  const score = scoreSignals(deletionSignals, hiddenSignals, context.snapshot);

  if (score < 5) {
    return createRuleResult({
      ruleId: RULE_ID,
      detected: false,
      probability: clampProbability(score / 12),
      confidence: getConfidence(score),
      impact: 'high',
      visualTarget: buildVisualTarget([]),
      occurrenceCount: 0
    });
  }

  const interactiveCount = getInteractiveElementCount(context.snapshot);
  const evidence: RuleResult['evidence'] =
    hiddenSignals.length > 0
      ? hiddenSignals.map((signal) => ({
          selector: generateUniqueSelector(signal.element),
          text: getEvidenceText(signal.element),
          reason: `Account deletion control found but intentionally hidden (${signal.reason})`,
          boundingBox: signal.element instanceof HTMLElement ? signal.element.getBoundingClientRect() : null
        }))
      : [
          {
            selector: 'body',
            text: getSummaryHeadingText(),
            reason: `No account deletion or deactivation controls found. Page contains ${interactiveCount} settings controls but none allow account removal.`,
            boundingBox: null
          }
        ];

  const selectors =
    hiddenSignals.length > 0 ? hiddenSignals.map((signal) => generateUniqueSelector(signal.element)) : [];
  const occurrenceCount = hiddenSignals.length > 0 ? hiddenSignals.length : 1;

  return createRuleResult({
    ruleId: RULE_ID,
    detected: true,
    probability: clampProbability(score / 12),
    confidence: getConfidence(score),
    impact: 'high',
    evidence,
    visualTarget: buildVisualTarget(selectors),
    occurrenceCount
  });
}
