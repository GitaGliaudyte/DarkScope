import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectDiscouragement } from './detection';

const K61Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'cart', 'checkout', 'account_settings'],
  detect(context: AnalysisContext): RuleResult {
    return detectDiscouragement(context);
  }
};

export default K61Rule;
