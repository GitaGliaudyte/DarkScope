import { Confidence, RuleResult } from '../../engine/types';

type Impact = RuleResult['impact'];

export interface ScoreablePreselectedInput {
  adjacency: 'DECISION_ADJACENT' | 'ISOLATED';
  hasPriceInLabel: boolean;
  isMarketing: boolean;
  isSubscription: boolean;
  isPaidAddon: boolean;
  isDonation: boolean;
  isHighestPricedRadio: boolean;
}

export interface ScoreSummary {
  rawScore: number;
  suspiciousCount: number;
  hasPricedLabel: boolean;
  hasMarketingConsent: boolean;
  hasPaidAddonOrSubscription: boolean;
  hasHighestPricedRadio: boolean;
  onlyMarketingConsent: boolean;
  onlyDonation: boolean;
}

/**
 * Computes the capped raw score for all suspicious pre-selected inputs detected on the page.
 */
export function computeScore(findings: ScoreablePreselectedInput[]): ScoreSummary {
  let rawScore = 0;
  let hasPricedLabel = false;
  let hasMarketingConsent = false;
  let hasPaidAddonOrSubscription = false;
  let hasHighestPricedRadio = false;

  for (const finding of findings) {
    rawScore += finding.adjacency === 'DECISION_ADJACENT' ? 4 : 2;
    hasPricedLabel = hasPricedLabel || finding.hasPriceInLabel;
    hasMarketingConsent = hasMarketingConsent || finding.isMarketing;
    hasPaidAddonOrSubscription = hasPaidAddonOrSubscription || finding.isPaidAddon || finding.isSubscription;
    hasHighestPricedRadio = hasHighestPricedRadio || finding.isHighestPricedRadio;
  }

  if (hasPricedLabel) {
    rawScore += 2;
  }

  if (hasMarketingConsent) {
    rawScore += 1;
  }

  if (findings.length >= 3) {
    rawScore += 2;
  }

  if (hasHighestPricedRadio) {
    rawScore += 3;
  }

  const onlyMarketingConsent = findings.length > 0 && findings.every((finding) => finding.isMarketing && !finding.isPaidAddon && !finding.isSubscription);
  const onlyDonation = findings.length > 0 && findings.every((finding) => finding.isDonation);

  return {
    rawScore: Math.min(rawScore, 15),
    suspiciousCount: findings.length,
    hasPricedLabel,
    hasMarketingConsent,
    hasPaidAddonOrSubscription,
    hasHighestPricedRadio,
    onlyMarketingConsent,
    onlyDonation
  };
}

/**
 * Derives rule confidence from the aggregate score while applying the rule-specific caps and floors.
 */
export function getConfidence(summary: ScoreSummary): Confidence {
  let confidence: Confidence = 'low';

  if (summary.rawScore >= 8) {
    confidence = 'high';
  } else if (summary.rawScore >= 4) {
    confidence = 'medium';
  }

  if (summary.onlyMarketingConsent && confidence === 'high') {
    confidence = 'medium';
  }

  if ((summary.hasPaidAddonOrSubscription || summary.hasHighestPricedRadio) && summary.rawScore > 0 && confidence === 'low') {
    confidence = 'medium';
  }

  return confidence;
}

/**
 * Maps the score summary to the normalized rule probability used by the engine.
 */
export function getProbability(summary: ScoreSummary): number {
  if (summary.rawScore >= 8) {
    return 1;
  }

  if (summary.rawScore >= 4) {
    return 0.7;
  }

  if (summary.rawScore >= 1) {
    return 0.4;
  }

  return 0;
}

/**
 * Determines the user impact of the detected pre-selected optional choices.
 */
export function getImpact(findings: ScoreablePreselectedInput[]): Impact {
  if (findings.some((finding) => finding.hasPriceInLabel || finding.isSubscription)) {
    return 'high';
  }

  if (findings.length === 0) {
    return 'low';
  }

  if (findings.every((finding) => finding.isMarketing)) {
    return 'medium';
  }

  if (findings.every((finding) => finding.isDonation)) {
    return 'medium';
  }

  return 'medium';
}
