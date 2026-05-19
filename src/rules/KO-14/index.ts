import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectAutomaticPopups } from './detection';

const KO14Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['generic', 'product', 'checkout'],
  detect(context: AnalysisContext): RuleResult {
    return detectAutomaticPopups(context);
  }
};

export default KO14Rule;
