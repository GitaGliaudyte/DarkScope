// This file runs every rule safely and guarantees a result object even when individual rules fail.
import { defaultPageClassifier } from './pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from './types';

export function createNotApplicableResult(ruleId: string): RuleResult {
  return {
    ruleId,
    detected: false,
    status: 'not_applicable',
    probability: 0,
    confidence: 'low',
    impact: 'low',
    evidence: [],
    explanation: '',
    recommendation: '',
    visualTarget: {
      type: 'none',
      selectors: []
    },
    occurrenceCount: 0
  };
}

export function createErrorResult(ruleId: string, _error?: unknown): RuleResult {
  return {
    ruleId,
    detected: false,
    status: 'error',
    probability: 0,
    confidence: 'low',
    impact: 'low',
    evidence: [],
    explanation: '',
    recommendation: '',
    visualTarget: {
      type: 'none',
      selectors: []
    },
    occurrenceCount: 0
  };
}

export async function runRuleEngine(context: AnalysisContext, rules: RuleDefinition[]): Promise<RuleResult[]> {
  return Promise.all(
    rules.map(async (rule) => {
      try {
        const pageClassifier = rule.pageClassifier ?? defaultPageClassifier;
        const isRelevant = pageClassifier(context.snapshot, rule.relevantOn);

        if (rule.skipIfNotRelevant === true && !isRelevant) {
          return createNotApplicableResult(rule.id);
        }

        if (rule.relevantContexts !== undefined && rule.relevantContexts.length > 0) {
          const pageType = context.pageContext.type;

          if (!rule.relevantContexts.includes(pageType)) {
            return createNotApplicableResult(rule.id);
          }
        }

        return await rule.detect(context);
      } catch (error) {
        return createErrorResult(rule.id, error);
      }
    })
  );
}
