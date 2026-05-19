import { defaultPageClassifier } from '../../engine/pageClassifier';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { RULE_ID } from './constants';
import { detectChatbotElements } from './detection';

const KO11Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['generic', 'product', 'checkout'],
  detect(context: AnalysisContext): RuleResult {
    return detectChatbotElements(context);
  }
};

export default KO11Rule;
