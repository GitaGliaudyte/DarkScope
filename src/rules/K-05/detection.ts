import { createErrorResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { probeCandidate } from './probing';
import { buildReason, getConfidence, getContextualImpact, getProbability, getStrongerImpact } from './scoring';
import { collectCandidates } from './signals';
import { RuleFinding } from './types';

export function detectBlockedTextCopy(_context: AnalysisContext): RuleResult {
  try {
    const candidates = collectCandidates();
    const findings = candidates
      .map(probeCandidate)
      .filter((candidate): candidate is RuleFinding => candidate !== null);

    if (findings.length === 0) {
      return createRuleResult({
        ruleId: RULE_ID,
        detected: false,
        probability: 0,
        confidence: 'low',
        impact: 'low',
        visualTarget: buildVisualTarget([]),
        occurrenceCount: 0
      });
    }

    let totalScore = 0;
    let strongestImpact: RuleResult['impact'] = 'low';
    const selectors: string[] = [];
    const evidence: RuleResult['evidence'] = [];

    for (const finding of findings) {
      const contextualImpact = getContextualImpact(finding);

      totalScore += finding.score;
      strongestImpact = getStrongerImpact(strongestImpact, contextualImpact);
      selectors.push(finding.selector);
      evidence.push({
        selector: finding.selector,
        text: finding.text,
        reason: buildReason(finding.element, finding.signals),
        boundingBox: finding.element.getBoundingClientRect(),
        zone: finding.zone,
        contextualImpact
      } as RuleResult['evidence'][number]);
    }

    const cappedScore = Math.min(totalScore, 20);

    return createRuleResult({
      ruleId: RULE_ID,
      detected: cappedScore > 0,
      probability: getProbability(cappedScore),
      confidence: getConfidence(cappedScore),
      impact: strongestImpact,
      evidence,
      visualTarget: buildVisualTarget(selectors),
      occurrenceCount: findings.length
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}
