import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { evaluateGroup, evaluatePercentageOnlyGroup, findPriceGroups } from './probing';
import { computeScore, getConfidence, getImpact, getProbability } from './scoring';
import { GroupEvaluation } from './types';

/**
 * Runs the KO-7 deceptive discount evaluation synchronously against the live document.
 */
export function evaluate(context: AnalysisContext): RuleResult {
  try {
    if (context.pageContext.type !== 'product' && context.pageContext.type !== 'cart') {
      return createNotApplicableResult(RULE_ID);
    }

    const searchResult = findPriceGroups(document);

    if (!searchResult.hasAnyPrice) {
      return createNotApplicableResult(RULE_ID);
    }

    const groupedEvaluations = searchResult.groups
      .map((group) => evaluateGroup(group))
      .filter((group): group is GroupEvaluation => group !== null);
    const percentageOnlyEvaluations =
      searchResult.percentageOnlyGroups.length === 0
        ? []
        : searchResult.percentageOnlyGroups.map((group) => evaluatePercentageOnlyGroup(group));

    if (!searchResult.hasOriginalPrice && percentageOnlyEvaluations.length === 0) {
      return createNotApplicableResult(RULE_ID);
    }

    const evaluations = [...groupedEvaluations, ...percentageOnlyEvaluations];
    const findings = evaluations.filter((group) => group.hasSuspiciousPercentage || group.hasInconsistentMath);

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

    const scoreSummary = computeScore(evaluations);
    const evidence: RuleResult['evidence'] = findings.map((finding) => ({
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
      impact: getImpact(evaluations),
      evidence,
      visualTarget: buildVisualTarget(findings.map((finding) => finding.visualSelector)),
      occurrenceCount: findings.length
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}

export const KO7Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'cart'],
  detect(context: AnalysisContext): RuleResult {
    return evaluate(context);
  }
};

export default KO7Rule;
