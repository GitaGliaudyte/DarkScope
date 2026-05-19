import { Confidence, RuleResult } from '../../engine/types';
import { AD_NETWORKS } from './constants';
import { RuleFinding, RuleSignals } from './types';

type Impact = RuleResult['impact'];

export function computeSignals(findings: RuleFinding[]): RuleSignals {
  const undisclosedFindings = findings.filter((finding) => finding.disclosure === 'undisclosed');
  const machineOnlyFindings = findings.filter((finding) => finding.disclosure === 'machine_only');

  return {
    undisclosedCount: undisclosedFindings.length,
    machineOnlyCount: machineOnlyFindings.length,
    hasAboveFoldUndisclosed: undisclosedFindings.some((finding) => finding.aboveFold),
    hasMajorNetworkUndisclosed: undisclosedFindings.some((finding) =>
      AD_NETWORKS.some((network) => network.major && finding.network === network.name)
    ),
    hasThreeOrMoreUndisclosed: undisclosedFindings.length >= 3
  };
}

export function computeScore(signals: RuleSignals): number {
  let score = signals.undisclosedCount * 3 + signals.machineOnlyCount;

  if (signals.hasAboveFoldUndisclosed) {
    score += 2;
  }

  if (signals.hasMajorNetworkUndisclosed) {
    score += 2;
  }

  if (signals.hasThreeOrMoreUndisclosed) {
    score += 2;
  }

  return Math.min(score, 15);
}

export function getConfidence(score: number, onlyMachineOnlyFindings: boolean): Confidence {
  if (onlyMachineOnlyFindings) {
    return score > 0 ? 'low' : 'low';
  }

  if (score >= 8) {
    return 'high';
  }

  if (score >= 4) {
    return 'medium';
  }

  return 'low';
}

export function getProbability(score: number, onlyMachineOnlyFindings: boolean): number {
  if (score <= 0) {
    return 0;
  }

  if (onlyMachineOnlyFindings) {
    return 0.4;
  }

  if (score >= 8) {
    return 1;
  }

  if (score >= 4) {
    return 0.7;
  }

  return 0.4;
}

export function getImpact(findings: RuleFinding[]): Impact {
  if (findings.length === 0) {
    return 'low';
  }

  const undisclosedFindings = findings.filter((finding) => finding.disclosure === 'undisclosed');

  if (undisclosedFindings.some((finding) => finding.aboveFold)) {
    return 'high';
  }

  if (undisclosedFindings.length === 0) {
    return 'low';
  }

  return 'medium';
}

export function buildReason(finding: RuleFinding): string {
  const networkDescription = finding.network === null ? 'ad-related attributes' : `${finding.network} ad infrastructure`;

  if (finding.disclosure === 'machine_only') {
    return `Advertising container identified by ${networkDescription} exposes disclosure only via aria-label or title`;
  }

  return `Advertising container identified by ${networkDescription} has no visible disclosure label`;
}
