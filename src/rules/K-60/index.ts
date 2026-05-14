import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectLimitedTime } from './detection';

const K60Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'cart', 'checkout'],
  detect(context: AnalysisContext): RuleResult {
    return detectLimitedTime(context);
  }
};

export default K60Rule;
