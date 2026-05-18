import { defaultPageClassifier } from '../../engine/pageClassifier';
import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { findPreselectedInputs, hasAnyPreselectedInputs } from './candidateDetection';
import { classifyInput, isDecisionAdjacent } from './classification';
import { getReferenceRect } from './domUtils';
import { computeScore, getConfidence, getImpact, getProbability } from './scoring';
import { ClassifiedInput } from './types';

/**
 * Runs the KO-10 pre-selected optional-choice evaluation synchronously against the live document.
 */
export function evaluate(context: AnalysisContext): RuleResult {
  try {
    if (
      context.pageContext.type !== 'product' &&
      context.pageContext.type !== 'registration' &&
      context.pageContext.type !== 'account_settings' &&
      context.pageContext.type !== 'cart'
    ) {
      return createNotApplicableResult(RULE_ID);
    }

    if (!(document.body instanceof HTMLElement) || !hasAnyPreselectedInputs(document)) {
      return createNotApplicableResult(RULE_ID);
    }

    const candidates = findPreselectedInputs(document);
    const findings = candidates
      .map((candidate) => classifyInput(candidate, document))
      .filter((candidate): candidate is ClassifiedInput => candidate.classification === 'SUSPICIOUS');

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

    const scoreSummary = computeScore(findings);
    const evidence: RuleResult['evidence'] = findings.map((finding) => ({
      selector: finding.selector,
      text: finding.displayText,
      reason: finding.reason,
      boundingBox: getReferenceRect(finding)
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

export { findPreselectedInputs, classifyInput, isDecisionAdjacent };

export const KO10Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'registration', 'account_settings', 'cart'],
  detect(context: AnalysisContext): RuleResult {
    return evaluate(context);
  }
};

export default KO10Rule;
