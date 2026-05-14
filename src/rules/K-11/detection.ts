import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import {
  FOOTER_SELECTOR,
  INTERACTIVE_FOLLOWUP_SELECTOR,
  LARGE_NAV_CATEGORY_MIN,
  MAIN_CONTENT_LINK_SELECTOR,
  MAIN_NAV_CATEGORY_MIN,
  MAIN_SETTINGS_PATH_SEGMENTS,
  MAX_EVIDENCE_TEXT_LENGTH,
  PRIVACY_HEADING_SELECTOR,
  PRIVACY_KEYWORDS,
  PRIVACY_NAV_CANDIDATE_SELECTOR,
  RULE_ID,
  SETTINGS_NAV_CONTAINER_SELECTOR,
  SETTINGS_NAV_ENTRY_SELECTOR,
  SETTINGS_NAV_SEARCH_SELECTOR,
  STRUCTURAL_CONTAINER_SELECTOR,
  SUBSECTION_KEYWORDS
} from './constants';
import { computeScore, getConfidence, getProbability } from './scoring';
import { ApplicabilitySignal, NavigationAnalysis, PrivacySearchResult, UrlAssessment } from './types';

function normalizeText(value: string | null | undefined): string {
  return normalizeWhitespace((value ?? '').toLowerCase());
}

function normalizePathToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/[^a-z0-9/ ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getVisibleText(element: Element): string {
  return normalizeWhitespace(element.textContent ?? '');
}

function isVisibleElement(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden' && style.display !== 'none';
}

function isInsideFooter(element: Element): boolean {
  return element.closest(FOOTER_SELECTOR) !== null;
}

function getElementLabel(element: Element): string {
  return normalizeWhitespace(
    element.getAttribute('aria-label') ?? element.getAttribute('title') ?? element.textContent ?? ''
  );
}

function getElementHrefPath(element: Element): string {
  if (!(element instanceof HTMLAnchorElement)) {
    return '';
  }

  const rawHref = element.getAttribute('href') ?? '';

  if (rawHref.length === 0) {
    return '';
  }

  const resolved = new URL(rawHref, window.location.href);
  return normalizePathToken(`${resolved.pathname} ${resolved.hash}`);
}

function valueMatchesPrivacyKeyword(value: string): boolean {
  const normalizedValue = normalizeText(value);
  return PRIVACY_KEYWORDS.some((keyword) => normalizedValue.includes(keyword));
}

function elementMatchesPrivacy(element: Element): boolean {
  const text = getVisibleText(element);
  const label = getElementLabel(element);
  const hrefPath = getElementHrefPath(element);

  return valueMatchesPrivacyKeyword(text) || valueMatchesPrivacyKeyword(label) || valueMatchesPrivacyKeyword(hrefPath);
}

function getDistinctLabels(elements: Element[]): string[] {
  const labels = new Set<string>();

  for (const element of elements) {
    const label = normalizeText(getElementLabel(element));

    if (label.length > 0) {
      labels.add(label);
    }
  }

  return Array.from(labels);
}

function getUniqueElements(selector: string, root: ParentNode = document): HTMLElement[] {
  const seen = new Set<HTMLElement>();
  const results: HTMLElement[] = [];

  for (const element of Array.from(root.querySelectorAll(selector))) {
    if (!isVisibleElement(element) || isInsideFooter(element) || seen.has(element)) {
      continue;
    }

    seen.add(element);
    results.push(element);
  }

  return results;
}

function assessUrl(url: string): UrlAssessment {
  const parsedUrl = new URL(url, window.location.href);
  const segments = parsedUrl.pathname
    .split('/')
    .map((segment) => normalizePathToken(segment))
    .filter((segment) => segment.length > 0);
  const firstSegment = segments[0] ?? '';
  const lastSegment = segments[segments.length - 1] ?? '';
  const isMainRoot = MAIN_SETTINGS_PATH_SEGMENTS.some((segment) => segment === firstSegment);
  const isSubsectionKeyword = SUBSECTION_KEYWORDS.some((keyword) => lastSegment.includes(keyword));
  const isPrivacyPage = PRIVACY_KEYWORDS.some((keyword) => lastSegment.includes(keyword));

  if (isMainRoot && segments.length === 1) {
    return { signal: 'main', isPrivacyPage: false };
  }

  if ((isMainRoot && segments.length > 1) || isSubsectionKeyword || isPrivacyPage) {
    return { signal: 'subsection', isPrivacyPage };
  }

  return { signal: 'ambiguous', isPrivacyPage };
}

function analyzeNavigation(): NavigationAnalysis {
  const containers = getUniqueElements(SETTINGS_NAV_CONTAINER_SELECTOR);
  const directEntries = getUniqueElements(SETTINGS_NAV_SEARCH_SELECTOR);
  let bestContainer: HTMLElement | null = null;
  let bestCategories: string[] = [];
  let bestPrivacyMatches: HTMLElement[] = [];

  for (const container of containers) {
    const entries = getUniqueElements(SETTINGS_NAV_ENTRY_SELECTOR, container);
    const categories = getDistinctLabels(entries);
    const privacyMatches = entries.filter((entry) => elementMatchesPrivacy(entry));

    if (categories.length > bestCategories.length) {
      bestContainer = container;
      bestCategories = categories;
      bestPrivacyMatches = privacyMatches;
    }
  }

  if (bestContainer === null && directEntries.length > 0) {
    bestCategories = getDistinctLabels(directEntries);
    bestPrivacyMatches = directEntries.filter((entry) => elementMatchesPrivacy(entry));
  }

  let signal: ApplicabilitySignal = 'ambiguous';

  if (bestCategories.length >= MAIN_NAV_CATEGORY_MIN) {
    signal = 'main';
  } else if (bestCategories.length > 0) {
    signal = 'subsection';
  }

  return {
    container: bestContainer,
    categories: bestCategories,
    privacyMatches: bestPrivacyMatches,
    signal
  };
}

function headingHasInteractiveFollowup(heading: HTMLElement): boolean {
  const container = heading.closest(STRUCTURAL_CONTAINER_SELECTOR) ?? heading.parentElement;

  if (container === null) {
    return false;
  }

  const interactiveElements = Array.from(container.querySelectorAll(INTERACTIVE_FOLLOWUP_SELECTOR)).filter(
    (element): element is HTMLElement => isVisibleElement(element) && !isInsideFooter(element)
  );

  return interactiveElements.some(
    (element) =>
      element !== heading &&
      Boolean(heading.compareDocumentPosition(element) & Node.DOCUMENT_POSITION_FOLLOWING) &&
      !heading.contains(element)
  );
}

function searchPrivacyEntries(navigation: NavigationAnalysis): PrivacySearchResult {
  const navigationCandidates = getUniqueElements(PRIVACY_NAV_CANDIDATE_SELECTOR).filter((element) =>
    elementMatchesPrivacy(element)
  );
  const bodyLinks = getUniqueElements(MAIN_CONTENT_LINK_SELECTOR).filter(
    (element) => element.closest(SETTINGS_NAV_CONTAINER_SELECTOR) === null && elementMatchesPrivacy(element)
  );
  const bodyHeadings = getUniqueElements(PRIVACY_HEADING_SELECTOR).filter(
    (element) =>
      element.closest(SETTINGS_NAV_CONTAINER_SELECTOR) === null &&
      elementMatchesPrivacy(element) &&
      headingHasInteractiveFollowup(element)
  );

  return {
    hasPrivacyInNavigation: navigation.privacyMatches.length > 0 || navigationCandidates.length > 0,
    hasPrivacyInBody: bodyLinks.length > 0 || bodyHeadings.length > 0
  };
}

function buildDetectedEvidence(navigation: NavigationAnalysis): RuleResult['evidence'] {
  const evidence: RuleResult['evidence'] = [];
  const container = navigation.container;
  const selector = container === null ? 'body' : generateUniqueSelector(container);
  const textSource = container === null ? document.body : container;

  evidence.push({
    selector,
    text: getVisibleText(textSource).slice(0, MAX_EVIDENCE_TEXT_LENGTH),
    reason: 'Settings navigation contains no link to privacy settings',
    boundingBox: container === null ? null : container.getBoundingClientRect()
  });

  if (navigation.categories.length >= LARGE_NAV_CATEGORY_MIN) {
    evidence.push({
      selector,
      text: navigation.categories.join(' | '),
      reason: `Navigation has ${navigation.categories.length} categories but none relates to privacy`,
      boundingBox: container === null ? null : container.getBoundingClientRect()
    });
  }

  return evidence;
}

export function detectPrivacySettingsReachability(context: AnalysisContext): RuleResult {
  try {
    const urlAssessment = assessUrl(context.snapshot.url);
    const navigation = analyzeNavigation();
    const hasMainSignal = urlAssessment.signal === 'main' || navigation.signal === 'main';
    const conflicted =
      (urlAssessment.signal === 'main' && navigation.signal === 'subsection') ||
      (urlAssessment.signal === 'subsection' && navigation.signal === 'main');

    if (urlAssessment.signal === 'subsection' && navigation.signal === 'subsection') {
      return createNotApplicableResult(RULE_ID);
    }

    if (!hasMainSignal) {
      return createNotApplicableResult(RULE_ID);
    }

    const privacySearch = searchPrivacyEntries(navigation);

    if (urlAssessment.isPrivacyPage) {
      return createNotApplicableResult(RULE_ID);
    }

    const score = computeScore({
      hasPrivacyInNavigation: privacySearch.hasPrivacyInNavigation,
      hasPrivacyInBodyOnly: !privacySearch.hasPrivacyInNavigation && privacySearch.hasPrivacyInBody,
      navigationCategoryCount: navigation.categories.length,
      urlSignal: urlAssessment.signal,
      navigationSignal: navigation.signal
    });

    if (score === 0) {
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

    return createRuleResult({
      ruleId: RULE_ID,
      detected: true,
      probability: getProbability(score),
      confidence: getConfidence(score, conflicted),
      impact: 'high',
      evidence: buildDetectedEvidence(navigation),
      visualTarget:
        navigation.container === null
          ? buildVisualTarget([])
          : buildVisualTarget([generateUniqueSelector(navigation.container)]),
      occurrenceCount: 1
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}
