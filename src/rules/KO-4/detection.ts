import { createErrorResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { RULE_ID } from './constants';
import { collectCandidates } from './signals';
import { probeCandidate } from './probing';
import { buildReason, downgradeImpact, getBaseImpact, getConfidence, getProbability } from './scoring';
import { RuleFinding } from './types';

export function detectBlockedCopyPaste(_context: AnalysisContext): RuleResult {
  try {
    const candidates = collectCandidates();
    const findings: RuleFinding[] = [];

    for (const candidate of candidates) {
      const finding = probeCandidate(candidate);

      if (finding !== null) {
        findings.push(finding);
      }
    }

    if (findings.length === 0) {
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

    for (const finding of findings) {
      const baseImpact = getBaseImpact(finding);
      const contextualImpact = finding.zone === 'supplemental' ? downgradeImpact(baseImpact) : baseImpact;

      if (baseImpact === 'high') {
        strongestImpact = 'high';
      } else if (strongestImpact === 'low') {
        strongestImpact = 'medium';
      }

      if (finding.zone === 'primary') {
        hasPrimaryZoneHit = true;
      }

      totalScore += finding.score;
      selectors.push(finding.selector);
      evidence.push({
        selector: finding.selector,
        text: finding.label,
        reason: buildReason(finding),
        boundingBox: finding.element.getBoundingClientRect(),
        zone: finding.zone,
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
      occurrenceCount: findings.length
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  } finally {
    if (document.body instanceof HTMLElement) {
      document.body.focus();
    }
  }
}
