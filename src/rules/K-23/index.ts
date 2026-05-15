import { defaultPageClassifier } from '../../engine/pageClassifier';
import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { findHigherPricedFindings, findProductGroups } from './probing';
import { computeScore, getConfidence, getImpact, getProbability } from './scoring';
import { CardFinding } from './types';

/**
 * Runs the K-23 higher-price visual-emphasis evaluation synchronously against the live document.
 */
export function evaluate(context: AnalysisContext): RuleResult {
  try {
    if (context.pageContext.type !== 'product' && context.pageContext.type !== 'checkout') {
      return createNotApplicableResult(RULE_ID);
    }

    if (!(document.body instanceof HTMLElement)) {
      return createNotApplicableResult(RULE_ID);
    }

    const groups = findProductGroups(document);

    if (groups.length === 0) {
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

    const findings = findHigherPricedFindings(groups);

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
    const evidence: RuleResult['evidence'] = findings.map((finding: CardFinding) => ({
      selector: finding.selector,
      text: finding.text,
      reason: finding.reason,
      boundingBox: finding.boundingBox
    }));

    return createRuleResult({
      ruleId: RULE_ID,
      detected: scoreSummary.rawScore > 0,
      probability: getProbability(scoreSummary),
      confidence: getConfidence(scoreSummary),
      impact: getImpact(findings),
      evidence,
      visualTarget: buildVisualTarget(findings.map((finding) => finding.visualSelector)),
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
  relevantContexts: ['product'],
  detect(context: AnalysisContext): RuleResult {
    return evaluate(context);
  }
};

export default rule;
