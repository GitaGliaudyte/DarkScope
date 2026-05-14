import { Confidence, RuleResult } from '../../engine/types';
import { HIGH_IMPACT_SELECTOR, MEDIUM_IMPACT_SELECTOR } from './constants';
import { RuleFinding, RuleSignals } from './types';

type Impact = RuleResult['impact'];

function matchesSelfOrAncestor(element: HTMLElement, selector: string): boolean {
  return element.matches(selector) || element.closest(selector) !== null;
}

export function getConfidence(score: number): Confidence {
  if (score >= 9) {
    return 'high';
  }

  if (score >= 4) {
    return 'medium';
  }

  return 'low';
}

export function getProbability(score: number): number {
  if (score >= 9) {
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

export function downgradeImpact(impact: Impact): Impact {
  if (impact === 'high') {
    return 'medium';
  }

  if (impact === 'medium') {
    return 'low';
  }

  return 'low';
}

export function getBaseImpact(element: HTMLElement): Impact {
  if (matchesSelfOrAncestor(element, HIGH_IMPACT_SELECTOR)) {
    return 'high';
  }

  if (matchesSelfOrAncestor(element, MEDIUM_IMPACT_SELECTOR)) {
    return 'medium';
  }

  return 'low';
}

function getContentDescription(element: HTMLElement): string {
  if (matchesSelfOrAncestor(element, '[class*="privacy"], [id*="privacy"]')) {
    return 'privacy policy section';
  }

  if (matchesSelfOrAncestor(element, '[class*="terms"], [id*="terms"]')) {
    return 'terms section';
  }

  if (matchesSelfOrAncestor(element, '[class*="policy"], [id*="policy"]')) {
    return 'policy section';
  }

  if (matchesSelfOrAncestor(element, '[class*="legal"], [id*="legal"]')) {
    return 'legal section';
  }

  if (matchesSelfOrAncestor(element, '[class*="spec"], [id*="spec"]')) {
    return 'product specification';
  }

  if (matchesSelfOrAncestor(element, '[class*="description"], [id*="description"]')) {
    return 'product description';
  }

  if (
    matchesSelfOrAncestor(
      element,
      '[class*="price"], [class*="pricing"], [class*="cost"], [id*="price"], [id*="pricing"]'
    )
  ) {
    return 'pricing section';
  }

  if (matchesSelfOrAncestor(element, '[class*="detail"], [id*="detail"]')) {
    return 'details section';
  }

  if (element.matches('main, [role="main"]')) {
    return 'main content area';
  }

  if (element.matches('article')) {
    return 'article content';
  }

  return 'content section';
}

export function buildReason(element: HTMLElement, signals: RuleSignals): string {
  const description = getContentDescription(element);
  const reasonParts: string[] = [];

  if (signals.copyEventBlocked) {
    reasonParts.push(`Copy event blocked on ${description}`);
  }

  if (signals.cssSelectionBlocked) {
    reasonParts.push(`user-select: none applied to ${description}`);
  }

  if (signals.inlineOnCopyBlocked) {
    reasonParts.push(`oncopy="return false" suppresses copy on ${description}`);
  }

  if (signals.inlineOnSelectStartBlocked) {
    reasonParts.push(`onselectstart suppresses text selection on ${description}`);
  }

  if (signals.inlineStyleSelectionBlocked) {
    reasonParts.push(`Inline style disables text selection on ${description}`);
  }

  return reasonParts.join('; ');
}

export function getStrongerImpact(left: Impact, right: Impact): Impact {
  const rank: Record<Impact, number> = {
    low: 0,
    medium: 1,
    high: 2
  };

  return rank[left] >= rank[right] ? left : right;
}

export function getContextualImpact(finding: RuleFinding): Impact {
  const baseImpact = getBaseImpact(finding.element);
  return finding.zone === 'supplemental' ? downgradeImpact(baseImpact) : baseImpact;
}
