import { defaultPageClassifier } from '../../engine/pageClassifier';
import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import {
  AD_DISCLOSURE_ATTRS,
  BUTTON_CLASS_PATTERNS,
  CHROME_CONTAINER_SELECTOR,
  CONTENT_CLASS_PATTERNS,
  CTA_PATTERNS,
  DATA_DISCLOSURE_PATTERNS,
  DISCLOSURE_ARIA_PATTERNS,
  DISCLOSURE_CLASS_PATTERNS,
  DISCLOSURE_TEXT_LABELS,
  LABELLED_AD_CONTAINER_SELECTOR,
  MAX_ELEMENTS,
  MAX_EVIDENCE,
  MAX_TEXT_LENGTH,
  PRIORITY_CONTENT_SELECTOR,
  RULE_ID,
  SIDEBAR_OR_FOOTER_SELECTOR,
  STRUCTURAL_CONTENT_SELECTOR
} from './constants';
import { computeScore, getConfidence, getImpact } from './scoring';
import { K12RuleResult, RuleCandidate, RuleFinding } from './types';

function truncateText(value: string, maxLength: number): string {
  return normalizeWhitespace(value).slice(0, maxLength);
}

function normalizeText(value: string | null | undefined): string {
  return normalizeWhitespace(value ?? '').toLowerCase();
}

function normalizeHostname(value: string): string {
  return value.trim().toLowerCase().replace(/^www\./, '');
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function matchesPhrase(value: string, patterns: readonly string[]): boolean {
  const normalizedValue = normalizeText(value);

  if (normalizedValue.length === 0) {
    return false;
  }

  return patterns.some((pattern) => {
    const phrasePattern = pattern
      .toLowerCase()
      .split(/\s+/)
      .map((part) => escapeRegex(part))
      .join('\\s+');

    return new RegExp(`\\b${phrasePattern}\\b`, 'i').test(normalizedValue);
  });
}

function getClassAndIdText(element: Element): string {
  const className = typeof (element as HTMLElement).className === 'string' ? (element as HTMLElement).className : '';

  return [className, element.id]
    .join(' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[-_:/]+/g, ' ')
    .toLowerCase();
}

function matchesClassOrIdPatterns(element: Element, patterns: readonly string[]): boolean {
  const haystack = getClassAndIdText(element);
  return patterns.some((pattern) => haystack.includes(pattern.toLowerCase().replace(/[-_:/]+/g, ' ')));
}

function getCandidateText(link: HTMLAnchorElement): string {
  return truncateText(
    link.innerText || link.textContent || link.getAttribute('aria-label') || link.getAttribute('title') || '',
    MAX_TEXT_LENGTH
  );
}

function getProbePriority(link: HTMLAnchorElement): number {
  if (link.closest(PRIORITY_CONTENT_SELECTOR) !== null) {
    return 0;
  }

  if (link.closest(SIDEBAR_OR_FOOTER_SELECTOR) !== null) {
    return 2;
  }

  if (link.closest(CHROME_CONTAINER_SELECTOR) !== null) {
    return 3;
  }

  return 1;
}

function collectExternalLinks(): RuleCandidate[] {
  const pageHostname = normalizeHostname(window.location.hostname);

  return Array.from(document.querySelectorAll('a[href]'))
    .filter((element): element is HTMLAnchorElement => element instanceof HTMLAnchorElement && element.isConnected)
    .map((element, index) => ({
      element,
      index,
      priority: getProbePriority(element)
    }))
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return left.priority - right.priority;
      }

      return left.index - right.index;
    })
    .slice(0, MAX_ELEMENTS)
    .map(({ element }) => {
      const rawHref = element.getAttribute('href');

      if (rawHref === null) {
        return null;
      }

      let resolvedUrl: URL;

      try {
        resolvedUrl = new URL(rawHref, window.location.href);
      } catch {
        return null;
      }

      if (resolvedUrl.protocol !== 'http:' && resolvedUrl.protocol !== 'https:') {
        return null;
      }

      const hostname = normalizeHostname(resolvedUrl.hostname);

      if (hostname === pageHostname) {
        return null;
      }

      return {
        element,
        selector: generateUniqueSelector(element),
        href: resolvedUrl.href,
        hostname,
        text: getCandidateText(element),
        title: truncateText(element.getAttribute('title') ?? '', MAX_TEXT_LENGTH),
        inChrome: element.closest(CHROME_CONTAINER_SELECTOR) !== null
      } satisfies RuleCandidate;
    })
    .filter((candidate): candidate is RuleCandidate => candidate !== null);
}

function hasDisclosureDataAttribute(link: HTMLAnchorElement): boolean {
  if (AD_DISCLOSURE_ATTRS.some((attribute) => link.hasAttribute(attribute))) {
    return true;
  }

  return Array.from(link.attributes).some((attribute) => {
    if (!attribute.name.startsWith('data-')) {
      return false;
    }

    return DATA_DISCLOSURE_PATTERNS.some((pattern) => attribute.name.includes(pattern));
  });
}

function hasDisclosureRel(link: HTMLAnchorElement): boolean {
  const rel = normalizeText(link.getAttribute('rel'));

  if (rel.length === 0) {
    return false;
  }

  const relTokens = new Set(rel.split(/\s+/));
  return relTokens.has('sponsored') || relTokens.has('nofollow');
}

function hasDisclosureClassSignal(link: HTMLAnchorElement): boolean {
  if (matchesClassOrIdPatterns(link, DISCLOSURE_CLASS_PATTERNS)) {
    return true;
  }

  let ancestor = link.parentElement;
  let depth = 0;

  while (ancestor !== null && depth < 3) {
    if (matchesClassOrIdPatterns(ancestor, DISCLOSURE_CLASS_PATTERNS)) {
      return true;
    }

    ancestor = ancestor.parentElement;
    depth += 1;
  }

  return false;
}

function hasDisclosureTextSignal(link: HTMLAnchorElement): boolean {
  return matchesPhrase(link.innerText || link.textContent || '', DISCLOSURE_TEXT_LABELS);
}

function isAdvertisingDisclosed(link: HTMLAnchorElement): boolean {
  return (
    hasDisclosureRel(link) ||
    hasDisclosureDataAttribute(link) ||
    matchesPhrase(link.getAttribute('aria-label') ?? '', DISCLOSURE_ARIA_PATTERNS) ||
    hasDisclosureClassSignal(link) ||
    hasDisclosureTextSignal(link)
  );
}

function hasCardLayout(link: HTMLAnchorElement): boolean {
  const container = link.closest(STRUCTURAL_CONTENT_SELECTOR);

  if (container === null) {
    return false;
  }

  const scope = container instanceof HTMLElement ? container : link;
  const hasImage = scope.querySelector('img') !== null || link.querySelector('img') !== null;
  const hasText = getCandidateText(link).length > 0;
  return hasImage && hasText;
}

function hasContentClassPattern(link: HTMLAnchorElement): boolean {
  if (matchesClassOrIdPatterns(link, CONTENT_CLASS_PATTERNS)) {
    return true;
  }

  let ancestor = link.parentElement;
  let depth = 0;

  while (ancestor !== null && depth < 3) {
    if (matchesClassOrIdPatterns(ancestor, CONTENT_CLASS_PATTERNS)) {
      return true;
    }

    ancestor = ancestor.parentElement;
    depth += 1;
  }

  return false;
}

function isButtonLike(link: HTMLAnchorElement): boolean {
  return (
    link.getAttribute('role') === 'button' ||
    matchesClassOrIdPatterns(link, BUTTON_CLASS_PATTERNS) ||
    link.querySelector('button') !== null
  );
}

function hasCtaPattern(link: HTMLAnchorElement, title: string): boolean {
  return matchesPhrase(`${getCandidateText(link)} ${title}`, CTA_PATTERNS);
}

function isInClearlyLabelledAdContainer(link: HTMLAnchorElement): boolean {
  let ancestor = link.closest(LABELLED_AD_CONTAINER_SELECTOR);

  while (ancestor !== null) {
    const headingText = Array.from(ancestor.querySelectorAll('h1, h2, h3, h4, h5, h6, [role="heading"]'))
      .map((element) => normalizeText(element.textContent))
      .join(' ');
    const ariaLabel = normalizeText(ancestor.getAttribute('aria-label'));

    if (
      matchesPhrase(headingText, DISCLOSURE_TEXT_LABELS) ||
      headingText.includes('advertisements') ||
      matchesPhrase(ariaLabel, DISCLOSURE_TEXT_LABELS) ||
      ariaLabel.includes('advertisements') ||
      matchesClassOrIdPatterns(ancestor, DISCLOSURE_CLASS_PATTERNS)
    ) {
      return true;
    }

    ancestor = ancestor.parentElement?.closest(LABELLED_AD_CONTAINER_SELECTOR) ?? null;
  }

  return false;
}

function evaluateSuspicion(candidate: RuleCandidate): RuleFinding | null {
  if (isAdvertisingDisclosed(candidate.element)) {
    return null;
  }

  const cardLayout = hasCardLayout(candidate.element);

  if (candidate.inChrome && !cardLayout) {
    return null;
  }

  const contentClassPattern = hasContentClassPattern(candidate.element);
  const buttonLike = isButtonLike(candidate.element);
  const ctaPattern = hasCtaPattern(candidate.element, candidate.title);

  if (!cardLayout && !contentClassPattern && !buttonLike && !ctaPattern) {
    return null;
  }

  const reasons: string[] = ['external link has no advertising disclosure'];

  if (cardLayout) {
    reasons.push('article or card-style layout with image and text');
  }

  if (contentClassPattern) {
    reasons.push('content-like class or id pattern');
  }

  if (buttonLike) {
    reasons.push('button-like element navigates to another domain');
  }

  if (ctaPattern) {
    reasons.push('editorial CTA wording without disclosure');
  }

  return {
    candidate,
    hasCardLayout: cardLayout,
    hasContentClassPattern: contentClassPattern,
    isButtonLike: buttonLike,
    hasCtaPattern: ctaPattern,
    reasons
  };
}

function buildEvidence(findings: RuleFinding[]): RuleResult['evidence'] {
  return findings.slice(0, MAX_EVIDENCE).map((finding) => ({
    selector: finding.candidate.selector,
    text:
      finding.candidate.text.length > 0
        ? finding.candidate.text
        : truncateText(finding.candidate.href, MAX_TEXT_LENGTH),
    reason: finding.reasons.join('; '),
    boundingBox: finding.candidate.element.getBoundingClientRect()
  }));
}

export function evaluate(context: AnalysisContext): K12RuleResult {
  try {
    if (context.pageContext.type !== 'product' && context.pageContext.type !== 'generic') {
      return createNotApplicableResult(RULE_ID);
    }

    const externalLinks = collectExternalLinks();

    if (externalLinks.length === 0) {
      return createNotApplicableResult(RULE_ID);
    }

    if (externalLinks.every((candidate) => isInClearlyLabelledAdContainer(candidate.element))) {
      return createNotApplicableResult(RULE_ID);
    }

    const findings = externalLinks
      .map(evaluateSuspicion)
      .filter((finding): finding is RuleFinding => finding !== null);
    const score = computeScore(findings);

    if (findings.length === 0) {
      return {
        ...createRuleResult({
          ruleId: RULE_ID,
          detected: false,
          probability: 0,
          confidence: 'low',
          impact: 'low',
          visualTarget: buildVisualTarget([]),
          occurrenceCount: 0
        }),
        score
      };
    }

    const hasButtonLike = findings.some((finding) => finding.isButtonLike);
    const hasCardLayoutSignal = findings.some((finding) => finding.hasCardLayout);
    const singleHasCardLayout = findings.length === 1 && findings[0].hasCardLayout;

    return {
      ...createRuleResult({
        ruleId: RULE_ID,
        detected: true,
        probability: Math.min(score / 15, 1),
        confidence: getConfidence(score, findings.length, singleHasCardLayout),
        impact: getImpact(hasButtonLike, hasCardLayoutSignal),
        evidence: buildEvidence(findings),
        visualTarget: buildVisualTarget(findings.map((finding) => finding.candidate.selector)),
        occurrenceCount: findings.length
      }),
      score
    };
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}

export const rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product', 'generic'],
  detect(context: AnalysisContext): RuleResult {
    return evaluate(context);
  }
};
