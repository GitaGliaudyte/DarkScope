import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectLimitedQuantity } from './detection';

const KO19Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'cart', 'checkout'],
  detect(context: AnalysisContext): RuleResult {
    return detectLimitedQuantity(context);
  }
};

export default KO19Rule;
