import { Confidence, RuleResult, VisualTarget } from '../engine/types';

interface CreateRuleResultOptions {
  ruleId: string;
  detected: boolean;
  probability: number;
  confidence: Confidence;
  impact: RuleResult['impact'];
  evidence?: RuleResult['evidence'];
  visualTarget?: VisualTarget;
  occurrenceCount?: number;
}

export function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

export function buildVisualTarget(selectors: string[]): VisualTarget {
  const uniqueSelectors = Array.from(new Set(selectors));

  return {
    type: uniqueSelectors.length > 1 ? 'multiple' : uniqueSelectors.length === 1 ? 'single' : 'none',
    selectors: uniqueSelectors
  };
}

export function createRuleResult({
  ruleId,
  detected,
  probability,
  confidence,
  impact,
  evidence = [],
  visualTarget = buildVisualTarget([]),
  occurrenceCount = evidence.length
}: CreateRuleResultOptions): RuleResult {
  return {
    ruleId,
    detected,
    status: detected ? 'detected' : 'not_detected',
    probability,
    confidence,
    impact,
    evidence,
    explanation: '',
    recommendation: '',
    visualTarget,
    occurrenceCount
  };
}
