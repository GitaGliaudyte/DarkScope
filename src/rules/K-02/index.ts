import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectDeletionAccessibility } from './detection';

const K02Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: true,
  relevantContexts: ['account_settings'],
  detect(context: AnalysisContext): RuleResult {
    return detectDeletionAccessibility(context);
  }
};

export default K02Rule;
