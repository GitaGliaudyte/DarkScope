import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectBlockedTextCopy } from './detection';

const K05Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'generic', 'account_settings'],
  detect(context: AnalysisContext): RuleResult {
    return detectBlockedTextCopy(context);
  }
};

export default K05Rule;
