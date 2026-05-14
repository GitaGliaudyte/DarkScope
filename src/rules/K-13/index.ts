import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectUndisclosedAdvertisingLabels } from './detection';

const K13Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'generic'],
  detect(context: AnalysisContext): RuleResult {
    return detectUndisclosedAdvertisingLabels(context);
  }
};

export default K13Rule;
