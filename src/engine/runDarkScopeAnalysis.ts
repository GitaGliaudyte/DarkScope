// This file orchestrates snapshotting, classification, rule execution, LLM enrichment, and overlay rendering.
import { classifyPageContext } from './classifyPageContext';
import { createPageSnapshot } from './domSnapshot';
import { enrichWithLLM } from './llmExplainer';
import { drawHighlights, removeHighlights } from './overlayRenderer';
import { runRuleEngine } from './ruleEngine';
import { AnalysisContext, RuleResult } from './types';
import rules from '../rules';
import { K_QUESTIONS } from '../rules/kQuestions';
import { computePrincipleScores } from '../scoring/principleScorer';

export async function runDarkScopeAnalysis(audienceMode: 'user' | 'designer' = 'user'): Promise<RuleResult[]> {
  removeHighlights();

  const snapshot = createPageSnapshot(document);
  const pageContext = await classifyPageContext();
  const context: AnalysisContext = {
    snapshot,
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight
    },
    pageContext
  };
  const rawResults = await runRuleEngine(context, rules);
  const results = await enrichWithLLM(rawResults, audienceMode);

  computePrincipleScores(results, K_QUESTIONS);

  drawHighlights(results);

  return results;
}
