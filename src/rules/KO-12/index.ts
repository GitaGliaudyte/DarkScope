import { generateUniqueSelector } from '../../engine/normalizedElements';
import { defaultPageClassifier } from '../../engine/pageClassifier';
import { createErrorResult, createNotApplicableResult } from '../../engine/ruleEngine';
import { AnalysisContext, RuleDefinition, RuleResult } from '../../engine/types';
import { buildVisualTarget, createRuleResult } from '../../rules-utilities/resultUtils';
import { MIN_PRODUCTS, MIN_STRONG_LISTING_PRODUCTS, RULE_ID } from './constants';
import { detectFiltering, detectSorting, hasPagination } from './controlDetection';
import { countProducts, getListingAnchor, isProductListingPage, shouldTreatAsProductDetailPage } from './productDetection';
import { computeScore, getConfidence, getImpact, getProbability, MissingControlsClassification } from './scoring';

function getClassification(sortFound: boolean, filterFound: boolean): MissingControlsClassification {
  if (sortFound && filterFound) {
    return 'BOTH_PRESENT';
  }

  if (sortFound) {
    return 'SORT_ONLY';
  }

  if (filterFound) {
    return 'FILTER_ONLY';
  }

  return 'BOTH_MISSING';
}

/**
 * Runs the KO-12 missing filter/sort evaluation synchronously against the live document.
 */
export function evaluate(context: AnalysisContext): RuleResult {
  try {
    const productCount = countProducts(document);
    const hasStrongListingSignal = productCount.count >= MIN_STRONG_LISTING_PRODUCTS;

    if (context.pageContext.type !== 'product' && !hasStrongListingSignal) {
      return createNotApplicableResult(RULE_ID);
    }

    if (productCount.count < MIN_PRODUCTS || shouldTreatAsProductDetailPage(document, productCount)) {
      return createNotApplicableResult(RULE_ID);
    }

    const sortDetection = detectSorting(document);
    const filterDetection = detectFiltering(document);
    const classification = getClassification(sortDetection.found, filterDetection.found);

    if (classification === 'BOTH_PRESENT') {
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

    const pagination = hasPagination(document);
    const scoreSummary = computeScore(classification, productCount.count, pagination);
    const listingAnchor = getListingAnchor(productCount.products);
    const anchorSelector = listingAnchor !== null ? generateUniqueSelector(listingAnchor) : productCount.products[0]?.selector ?? '';
    const anchorBoundingBox = listingAnchor?.getBoundingClientRect() ?? productCount.products[0]?.boundingBox ?? null;
    const listingText = `Detected ${productCount.countLabel} product cards on listing page`;
    const evidence: RuleResult['evidence'] = [];

    if (!sortDetection.found) {
      evidence.push({
        selector: anchorSelector,
        text: listingText,
        reason: `No sorting control found for ${productCount.countLabel}-item product listing`,
        boundingBox: anchorBoundingBox
      });
    }

    if (!filterDetection.found) {
      evidence.push({
        selector: anchorSelector,
        text: listingText,
        reason: `No filtering control found for ${productCount.countLabel}-item product listing`,
        boundingBox: anchorBoundingBox
      });
    }

    return createRuleResult({
      ruleId: RULE_ID,
      detected: scoreSummary.rawScore > 0,
      probability: getProbability(scoreSummary),
      confidence: getConfidence(scoreSummary),
      impact: getImpact(scoreSummary),
      evidence,
      visualTarget: buildVisualTarget([]),
      occurrenceCount: evidence.length
    });
  } catch (error) {
    return createErrorResult(RULE_ID, error);
  }
}

export { countProducts, detectFiltering, detectSorting, hasPagination, isProductListingPage };

export const KO12Rule: RuleDefinition = {
  id: RULE_ID,
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: false,
  relevantContexts: ['product'],
  detect(context: AnalysisContext): RuleResult {
    return evaluate(context);
  }
};

export default KO12Rule;
