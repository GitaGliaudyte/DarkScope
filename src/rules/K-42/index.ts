import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectSignupDataIssues } from './detection';

const K42Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['registration'],
  detect(context: AnalysisContext): RuleResult {
    return detectSignupDataIssues(context);
  }
};

export default K42Rule;
