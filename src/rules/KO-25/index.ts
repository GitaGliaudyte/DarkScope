import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectPersonalizationLock } from './detection';

const KO25Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'account_settings', 'generic', 'checkout'],
  detect(context: AnalysisContext): RuleResult {
    return detectPersonalizationLock(context);
  }
};

export default KO25Rule;
