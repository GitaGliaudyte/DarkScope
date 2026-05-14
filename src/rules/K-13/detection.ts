import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { buildFinding, collectCandidateMatches } from './probing';
import { buildReason, computeScore, computeSignals, getConfidence, getImpact, getProbability } from './scoring';
import { RuleFinding } from './types';

export function detectUndisclosedAdvertisingLabels(context: AnalysisContext): RuleResult {
  try {
    if (context.pageContext.type !== 'product' && context.pageContext.type !== 'generic') {
      return createNotApplicableResult(RULE_ID);
    }

    const candidates = collectCandidateMatches();

    if (candidates.length === 0) {
      return createNotApplicableResult(RULE_ID);
    }

    const findings = candidates
      .map((candidate) => buildFinding(candidate))
      .filter((finding): finding is RuleFinding => finding !== null);

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

    const signals = computeSignals(findings);
    const score = computeScore(signals);
    const onlyMachineOnlyFindings = signals.undisclosedCount === 0 && signals.machineOnlyCount > 0;
    const evidence: RuleResult['evidence'] = findings.map((finding) => ({
      selector: finding.selector,
      text: finding.text,
      reason: buildReason(finding),
      boundingBox: finding.boundingBox
    }));

    return createRuleResult({
      ruleId: RULE_ID,
      detected: true,
      probability: getProbability(score, onlyMachineOnlyFindings),
      confidence: getConfidence(score, onlyMachineOnlyFindings),
      impact: getImpact(findings),
      evidence,
      visualTarget: buildVisualTarget(findings.map((finding) => finding.visualSelector)),
      occurrenceCount: findings.length
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}
