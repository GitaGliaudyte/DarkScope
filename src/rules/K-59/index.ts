import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectCountdownTimer } from './detection';

const K59Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'cart', 'checkout'],
  detect(context: AnalysisContext): RuleResult {
    return detectCountdownTimer(context);
  }
};

export default K59Rule;
