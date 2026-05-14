import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectBrokenLinks } from './detection';

const K04Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'registration', 'account_settings', 'checkout', 'cart'],
  detect(context: AnalysisContext): Promise<RuleResult> {
    return detectBrokenLinks(context);
  }
};

export default K04Rule;
