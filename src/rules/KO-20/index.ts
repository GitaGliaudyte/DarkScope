import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectReviewIssues } from './detection';

const KO20Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product'],
  detect(context: AnalysisContext): RuleResult {
    return detectReviewIssues(context);
  }
};

export default KO20Rule;
