import { AnalysisContext, RuleResult } from '../../engine/types';
import { createRuleResult, clampProbability, buildVisualTarget } from '../../rules-utilities/resultUtils';
import { generateUniqueSelector, isVisibleElement } from '../../engine/normalizedElements';
import { isRealPersonalizationBlock } from './scoring';
import {
  RULE_ID,
  PERSONALIZATION_INDICATORS,
  PERSONALIZATION_DISABLE_PATTERNS,
  PERSONALIZATION_DISABLE_SELECTORS,
  EXCLUSION_PATTERNS,
  EXCLUSION_SELECTORS
} from './constants';

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

function isExcludedElement(el: HTMLElement): boolean {
  const idAndClass = `${el.id} ${el.className}`;
  if (matchesAny(idAndClass, EXCLUSION_PATTERNS)) {
    return true;
  }

  const text = (el.textContent ?? '').toLowerCase();
  if (matchesAny(text, EXCLUSION_PATTERNS)) {
    return true;
  }

  if (el.closest(EXCLUSION_SELECTORS.join(',')) !== null) {
    return true;
  }

  return false;
}

function findPersonalizationHeadersByText(): HTMLElement[] {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>('h1,h2,h3,h4,h5,span,div,section,header'));
  return nodes.filter((el) => {
    if (!isVisibleElement(el)) return false;
    if (isExcludedElement(el)) return false;

    const text = (el.textContent ?? '').trim();
    return text.length > 0 && matchesAny(text, PERSONALIZATION_INDICATORS);
  });
}

export function detectPersonalizationLock(context: AnalysisContext): RuleResult {
  const evidence: RuleResult['evidence'] = [];
  const selectors = new Set<string>();
  let personalizationFound = false;
  let disableFound = false;

  const headerCandidatesByAttr = Array.from(
    document.querySelectorAll<HTMLElement>(
      '[id*="recommend"],[class*="recommend"],[id*="personal"],[class*="personal"],[id*="suggest"],[class*="suggest"],[id*="for-you"],[class*="for-you"],[class*="feed"],[id*="feed"],[class*="upsell"],[id*="upsell"]'
    )
  ).filter((el) => isVisibleElement(el) && !isExcludedElement(el));

  const headerCandidatesByText = findPersonalizationHeadersByText();
  const personalizationHeaders = Array.from(
    new Map([...headerCandidatesByAttr, ...headerCandidatesByText].map((el) => [el, el])).values()
  );

  if (personalizationHeaders.length === 0) {
    const genericBlocks = Array.from(
      document.querySelectorAll<HTMLElement>('[data-recommendation], [data-personalized], [data-widget-type*="recommend"]')
    ).filter((el) => isVisibleElement(el) && !isExcludedElement(el));

    if (genericBlocks.length > 0) {
      personalizationFound = true;
      for (const block of genericBlocks) {
        const selector = generateUniqueSelector(block);
        selectors.add(selector);
        evidence.push({
          selector,
          text: block.textContent?.trim().slice(0, 200) ?? '',
          reason: 'Personalized content block detected via data attributes.',
          boundingBox: block.getBoundingClientRect()
        });
      }
    }
  }

  for (const header of personalizationHeaders) {
    if (isExcludedElement(header)) continue;

    personalizationFound = true;
    const sectionRoot = header.closest<HTMLElement>('section, main, [class*="container"], [class*="wrapper"]') ?? header.parentElement;
    
    if (sectionRoot) {
      if (isExcludedElement(sectionRoot)) continue;

      const rootSelector = generateUniqueSelector(sectionRoot);
      selectors.add(rootSelector);
      
      evidence.push({
        selector: rootSelector,
        text: header.textContent?.trim().slice(0, 100) ?? '',
        reason: 'Personalized content section container.',
        boundingBox: sectionRoot.getBoundingClientRect()
      });
    } else {
      const headerSelector = generateUniqueSelector(header);
      selectors.add(headerSelector);
      evidence.push({
        selector: headerSelector,
        text: header.textContent?.trim().slice(0, 100) ?? '',
        reason: 'Personalized content section header.',
        boundingBox: header.getBoundingClientRect()
      });
    }

    const sectionRootFinal = sectionRoot ?? document.body;
    if (isRealPersonalizationBlock(sectionRootFinal)) {
      evidence.push({
        selector: generateUniqueSelector(header),
        text: 'Contains personalized product elements.',
        reason: 'Verified inside block products.',
        boundingBox: header.getBoundingClientRect()
      });
    }
  }

  const disableCandidates = Array.from(
    document.querySelectorAll<HTMLElement>(PERSONALIZATION_DISABLE_SELECTORS.join(','))
  ).filter((el) => isVisibleElement(el));

  for (const el of disableCandidates) {
    const text = el.textContent?.trim() ?? '';
    const aria = el.getAttribute('aria-label') || '';
    const title = el.getAttribute('title') || '';
    if (matchesAny(text, PERSONALIZATION_DISABLE_PATTERNS) || matchesAny(aria, PERSONALIZATION_DISABLE_PATTERNS) || matchesAny(title, PERSONALIZATION_DISABLE_PATTERNS)) {
      disableFound = true;
      break;
    }
  }

  const detected = personalizationFound && !disableFound;
  const probability = detected ? clampProbability(0.85) : 0;
  const confidence: RuleResult['confidence'] = detected ? 'medium' : 'low';

  return createRuleResult({
    ruleId: RULE_ID,
    detected,
    probability,
    confidence,
    impact: 'medium',
    evidence,
    visualTarget: buildVisualTarget(Array.from(selectors)),
    occurrenceCount: evidence.length
  });
}