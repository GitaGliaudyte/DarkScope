import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectBlockedCopyPaste } from './detection';

const K06Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['account_settings', 'checkout', 'registration'],
  detect(context: AnalysisContext): RuleResult {
    return detectBlockedCopyPaste(context);
  }
};

export default K06Rule;
