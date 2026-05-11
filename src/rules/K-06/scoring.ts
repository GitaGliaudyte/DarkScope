import { Confidence, RuleResult } from '../../engine/types';
import { getFieldDescription } from './signals';
import { FlaggedElement, ProbeCandidate } from './types';

export function downgradeImpact(impact: RuleResult['impact']): RuleResult['impact'] {
  if (impact === 'high') {
    return 'medium';
  }

  if (impact === 'medium') {
    return 'low';
  }

  return 'low';
}

export function getConfidence(score: number): Confidence {
  if (score >= 8) {
    return 'high';
  }

  if (score >= 4) {
    return 'medium';
  }

  return 'low';
}

export function getProbability(score: number): number {
  if (score >= 8) {
    return 1;
  }

  if (score >= 4) {
    return 0.7;
  }

  if (score >= 1) {
    return 0.4;
  }

  return 0;
}

export function getBaseImpact(candidate: ProbeCandidate): RuleResult['impact'] {
  return candidate.passwordField || candidate.paymentField ? 'high' : 'medium';
}

export function buildReason(candidate: FlaggedElement): string {
  const reasonParts: string[] = [];

  if (candidate.signals.pasteBlocked && candidate.signals.copyBlocked) {
    reasonParts.push(`Copy and paste blocked on ${getFieldDescription(candidate)}`);
  } else if (candidate.signals.pasteBlocked) {
    reasonParts.push(`Paste blocked on ${getFieldDescription(candidate)}`);
  } else if (candidate.signals.copyBlocked) {
    reasonParts.push(`Copy blocked on ${getFieldDescription(candidate)}`);
  }

  if (candidate.signals.inlineOnPasteBlocked) {
    reasonParts.push('Inline onpaste handler suppresses paste');
  }

  if (candidate.signals.inlineOnCopyBlocked) {
    reasonParts.push('Inline oncopy handler suppresses copy');
  }

  if (candidate.signals.dragFillBlocked) {
    reasonParts.push('Drag-to-fill disabled on field');
  }

  if (candidate.signals.autocompleteOff) {
    reasonParts.push('Autocomplete disabled on password or payment field');
  }

  if (reasonParts.length === 0) {
    reasonParts.push(`Clipboard interaction blocked on ${getFieldDescription(candidate)}`);
  }

  return reasonParts.join('; ');
}
