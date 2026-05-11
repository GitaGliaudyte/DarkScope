import { defaultPageClassifier } from '../../engine/pageClassifier';
import { createErrorResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { collectCandidates } from './signals';
import { probeCandidate } from './probing';
import { buildReason, downgradeImpact, getBaseImpact, getConfidence, getProbability } from './scoring';
import { FlaggedElement } from './types';

function detectBlockedCopyPaste(_context: AnalysisContext): RuleResult {
  try {
    const candidates = collectCandidates();
    const flaggedElements: FlaggedElement[] = [];

    for (const candidate of candidates) {
      const flagged = probeCandidate(candidate);

      if (flagged !== null) {
        flaggedElements.push(flagged);
      }
    }

    if (flaggedElements.length === 0) {
      return createRuleResult({
        ruleId: RULE_ID,
        detected: false,
        probability: 0,
        confidence: 'low',
        impact: 'low',
        visualTarget: buildVisualTarget([]),
        occurrenceCount: 0
      });
    }

    const evidence: RuleResult['evidence'] = [];
    const selectors: string[] = [];
    let totalScore = 0;
    let strongestImpact: RuleResult['impact'] = 'low';
    let hasPrimaryZoneHit = false;

    for (const flagged of flaggedElements) {
      const baseImpact = getBaseImpact(flagged);
      const contextualImpact = flagged.zone === 'supplemental' ? downgradeImpact(baseImpact) : baseImpact;

      if (baseImpact === 'high') {
        strongestImpact = 'high';
      } else if (strongestImpact === 'low') {
        strongestImpact = 'medium';
      }

      if (flagged.zone === 'primary') {
        hasPrimaryZoneHit = true;
      }

      totalScore += flagged.score;
      selectors.push(flagged.selector);
      evidence.push({
        selector: flagged.selector,
        text: flagged.label,
        reason: buildReason(flagged),
        boundingBox: flagged.element.getBoundingClientRect(),
        zone: flagged.zone,
        contextualImpact
      } as RuleResult['evidence'][number]);
    }

    const cappedScore = Math.min(totalScore, 20);
    const impact = hasPrimaryZoneHit ? strongestImpact : downgradeImpact(strongestImpact);

    return createRuleResult({
      ruleId: RULE_ID,
      detected: cappedScore > 0,
      probability: getProbability(cappedScore),
      confidence: getConfidence(cappedScore),
      impact,
      evidence,
      visualTarget: buildVisualTarget(selectors),
      occurrenceCount: flaggedElements.length
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  } finally {
    if (document.body instanceof HTMLElement) {
      document.body.focus();
    }
  }
}

const K05Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['account_settings', 'checkout', 'registration'],
  detect(context: AnalysisContext): RuleResult {
    return detectBlockedCopyPaste(context);
  }
};

export default K05Rule;
