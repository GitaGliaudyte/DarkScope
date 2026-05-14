import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectPrivacySettingsReachability } from './detection';

const K11Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['account_settings'],
  detect(context: AnalysisContext): RuleResult {
    return detectPrivacySettingsReachability(context);
  }
};

export default K11Rule;
