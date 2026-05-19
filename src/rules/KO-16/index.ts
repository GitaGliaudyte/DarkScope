import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectPreCheckedCheckboxes } from './detection';

const KO16Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['checkout', 'account_settings', 'registration', 'generic'],
  detect(context: AnalysisContext): RuleResult {
    return detectPreCheckedCheckboxes(context);
  }
};

export default KO16Rule;
