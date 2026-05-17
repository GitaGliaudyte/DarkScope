import { defaultPageClassifier } from '../../engine/pageClassifier';
import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import {
  buildReason,
  collectTopLayerCandidateElements,
  findTopLayerCandidates,
  hasOverlappingFindings,
  measureCoverage
} from './probing';
import { computeScore, getConfidence, getImpact, getProbability } from './scoring';
import { CoverageMeasurement } from './types';

/**
 * Runs the K-20 top-layer coverage evaluation synchronously against the live document.
 */
export function evaluate(context: AnalysisContext): RuleResult {
  try {
    if (context.pageContext.type !== 'product' && context.pageContext.type !== 'checkout') {
      return createNotApplicableResult(RULE_ID);
    }

    const allCandidates = collectTopLayerCandidateElements(document);

    if (allCandidates.length === 0) {
      return createNotApplicableResult(RULE_ID);
    }

    const visibleCandidates = findTopLayerCandidates(document);

    if (visibleCandidates.length === 0) {
      return createNotApplicableResult(RULE_ID);
    }

    const findings = visibleCandidates
      .map((candidate) => measureCoverage(candidate))
      .filter((candidate): candidate is CoverageMeasurement => candidate !== null);

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

    const scoreSummary = computeScore(findings, hasOverlappingFindings(findings));
    const evidence: RuleResult['evidence'] = findings.map((finding) => ({
      selector: finding.selector,
      text: finding.text,
      reason: buildReason(finding),
      boundingBox: finding.rect
    }));

    return createRuleResult({
      ruleId: RULE_ID,
      detected: scoreSummary.rawScore > 0,
      probability: getProbability(scoreSummary),
      confidence: getConfidence(scoreSummary),
      impact: getImpact(findings),
      evidence,
      visualTarget: buildVisualTarget(findings.map((finding) => finding.selector)),
      occurrenceCount: findings.length
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}

export const rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'checkout', 'cart', 'account_settings'],
  detect(context: AnalysisContext): RuleResult {
    return evaluate(context);
  }
};

export default rule;
