import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import {
  DISCOUNT_THRESHOLD,
  EXCLUDED_CONTAINER_SELECTOR,
  FINAL_PRICE_KEYWORDS,
  FINAL_PRICE_SELECTORS,
  MAX_COMMON_ANCESTOR_DEPTH,
  MAX_CANDIDATE_DESCENDANTS,
  MAX_CANDIDATE_HEIGHT_RATIO,
  MAX_CANDIDATE_TEXT_LENGTH,
  MAX_CANDIDATE_WIDTH_RATIO,
  MAX_EVIDENCE_TEXT_LENGTH,
  MAX_GROUP_TARGET_DESCENDANTS,
  MAX_GROUP_TARGET_HEIGHT_RATIO,
  MAX_GROUP_TARGET_TEXT_LENGTH,
  MAX_GROUP_TARGET_WIDTH_RATIO,
  MAX_PRICE_GROUPS,
  MAX_PRICE_VALUE,
  MAX_PROXIMITY_PX,
  MAX_RANGE_CONTEXT_DEPTH,
  MAX_RANGE_CONTEXT_TEXT_LENGTH,
  MAX_SHIPPING_CONTEXT_DEPTH,
  MAX_SHIPPING_CONTEXT_TEXT_LENGTH,
  ORIGINAL_PRICE_KEYWORDS,
  ORIGINAL_PRICE_SELECTORS,
  PRIORITY_ROOT_SELECTOR,
  SHIPPING_KEYWORDS,
  SHIPPING_PRICE_SELECTORS,
  SUPPLEMENTAL_CONTAINER_SELECTOR
} from './constants';
import { extractPriceTokens, extractTextPrice, isPriceRangeText, parseDiscountLabel, parsePrice } from './parsing';
import { DiscountLabelCandidate, GroupEvaluation, PercentageOnlyGroup, PriceCandidate, PriceGroup, PriceGroupSearchResult } from './types';

function getPrimaryFindingTarget(group: PriceGroup, hasSuspiciousPercentage: boolean): PriceCandidate | DiscountLabelCandidate {
  if (hasSuspiciousPercentage && group.percentageLabel !== null) {
    return group.percentageLabel;
  }

  return group.final;
}

function isVisibleElement(element: Element): element is HTMLElement {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  if (element.closest(EXCLUDED_CONTAINER_SELECTOR) !== null) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const style = window.getComputedStyle(element);

  return rect.width > 0 && rect.height > 0 && style.display !== 'none' && style.visibility !== 'hidden';
}

function isOversizedCandidateRect(rect: DOMRect): boolean {
  return rect.width > window.innerWidth * MAX_CANDIDATE_WIDTH_RATIO || rect.height > window.innerHeight * MAX_CANDIDATE_HEIGHT_RATIO;
}

function isOversizedGroupTargetRect(rect: DOMRect): boolean {
  return rect.width > window.innerWidth * MAX_GROUP_TARGET_WIDTH_RATIO || rect.height > window.innerHeight * MAX_GROUP_TARGET_HEIGHT_RATIO;
}

export function isPlausiblePrice(value: number | null): value is number {
  return value !== null && value >= 0 && value <= MAX_PRICE_VALUE;
}

function getElementText(element: HTMLElement): string {
  const textParts = [
    element.textContent ?? '',
    element.getAttribute('aria-label') ?? '',
    element.getAttribute('title') ?? ''
  ].filter((value) => value.length > 0);

  return normalizeWhitespace(textParts.join(' '));
}

function getElementAttributeBlob(element: HTMLElement): string {
  const attributes = Array.from(element.attributes).map((attribute) => `${attribute.name} ${attribute.value}`);

  return normalizeWhitespace(
    [element.className, element.id, ...attributes]
      .filter((value): value is string => typeof value === 'string' && value.length > 0)
      .join(' ')
      .toLowerCase()
  );
}

function hasVisibleChildElement(element: HTMLElement): boolean {
  return Array.from(element.children).some((child) => child instanceof HTMLElement && isVisibleElement(child));
}

function containsMatchingPriceDescendant(element: HTMLElement, priceText: string): boolean {
  return Array.from(element.children).some((child) => {
    if (!(child instanceof HTMLElement) || !isVisibleElement(child)) {
      return false;
    }

    const childText = getElementText(child);

    if (childText.length === 0 || childText.length > MAX_CANDIDATE_TEXT_LENGTH) {
      return false;
    }

    return extractPriceTokens(childText).includes(priceText);
  });
}

function containsMatchingDiscountDescendant(element: HTMLElement, parsedLabel: DiscountLabelCandidate['parsedLabel']): boolean {
  return Array.from(element.children).some((child) => {
    if (!(child instanceof HTMLElement) || !isVisibleElement(child)) {
      return false;
    }

    const childText = getElementText(child);

    if (childText.length === 0 || childText.length > MAX_CANDIDATE_TEXT_LENGTH) {
      return false;
    }

    const childDiscount = parseDiscountLabel(childText);

    return childDiscount !== null && childDiscount.type === parsedLabel.type && childDiscount.value === parsedLabel.value;
  });
}

function isAtomicCandidateElement(element: HTMLElement, text: string): boolean {
  const rect = element.getBoundingClientRect();

  if (isOversizedCandidateRect(rect)) {
    return false;
  }

  if (text.length > MAX_CANDIDATE_TEXT_LENGTH) {
    return false;
  }

  if (element.querySelectorAll('*').length > MAX_CANDIDATE_DESCENDANTS) {
    return false;
  }

  if (hasVisibleChildElement(element) && text.length > 32) {
    return false;
  }

  return true;
}

function collectGroupTargetElements(
  group: PriceGroup,
  hasSuspiciousPercentage: boolean,
  hasInconsistentMath: boolean
): HTMLElement[] {
  const elements = new Set<HTMLElement>();

  elements.add(group.original.element);
  elements.add(group.final.element);

  if (hasSuspiciousPercentage && group.percentageLabel !== null) {
    elements.add(group.percentageLabel.element);
  }

  if (hasInconsistentMath) {
    if (group.percentageLabel !== null) {
      elements.add(group.percentageLabel.element);
    }

    if (group.absoluteLabel !== null) {
      elements.add(group.absoluteLabel.element);
    }
  }

  return Array.from(elements);
}

function getElementAncestors(element: HTMLElement): HTMLElement[] {
  const ancestors: HTMLElement[] = [];
  let current: HTMLElement | null = element;

  while (current !== null && current !== document.body) {
    ancestors.push(current);
    current = current.parentElement;
  }

  return ancestors;
}

function getLowestCommonAncestor(elements: HTMLElement[]): HTMLElement | null {
  if (elements.length === 0) {
    return null;
  }

  const firstAncestors = getElementAncestors(elements[0]);

  for (const ancestor of firstAncestors) {
    if (elements.every((element) => ancestor.contains(element))) {
      return ancestor;
    }
  }

  return null;
}

function isReasonableGroupTarget(element: HTMLElement): boolean {
  if (!isVisibleElement(element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();
  const text = getElementText(element);

  if (isOversizedGroupTargetRect(rect)) {
    return false;
  }

  if (text.length > MAX_GROUP_TARGET_TEXT_LENGTH) {
    return false;
  }

  if (element.querySelectorAll('*').length > MAX_GROUP_TARGET_DESCENDANTS) {
    return false;
  }

  return true;
}

function resolveGroupedVisualTarget(group: PriceGroup, hasSuspiciousPercentage: boolean, hasInconsistentMath: boolean): HTMLElement {
  const primaryTarget = getPrimaryFindingTarget(group, hasSuspiciousPercentage).element;
  const relevantElements = collectGroupTargetElements(group, hasSuspiciousPercentage, hasInconsistentMath);
  const lowestCommonAncestor = getLowestCommonAncestor(relevantElements);

  if (lowestCommonAncestor !== null && lowestCommonAncestor !== document.body && isReasonableGroupTarget(lowestCommonAncestor)) {
    return lowestCommonAncestor;
  }

  return primaryTarget;
}

function resolvePercentageOnlyVisualTarget(group: PercentageOnlyGroup): HTMLElement {
  if (group.final === null) {
    return group.percentageLabel.element;
  }

  const sharedContainer = getSharedContainer(group.percentageLabel.element, group.final.element);

  if (sharedContainer !== null && sharedContainer !== document.body && isReasonableGroupTarget(sharedContainer)) {
    return sharedContainer;
  }

  return group.percentageLabel.element;
}

function getPriority(element: HTMLElement): number {
  if (element.closest(SUPPLEMENTAL_CONTAINER_SELECTOR) !== null) {
    return 0;
  }

  if (element.closest(PRIORITY_ROOT_SELECTOR) !== null) {
    return 2;
  }

  return 1;
}

function hasLineThrough(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return style.textDecorationLine.includes('line-through') || style.textDecoration.includes('line-through');
}

function matchesKeyword(attributes: string, keywords: readonly string[]): boolean {
  return keywords.some((keyword) => attributes.includes(keyword));
}

function hasShippingKeyword(value: string): boolean {
  const normalized = normalizeWhitespace(value.toLowerCase());
  return SHIPPING_KEYWORDS.some((keyword) => normalized.includes(keyword));
}

function isCompactShippingContext(element: HTMLElement): boolean {
  const text = getElementText(element);

  if (text.length === 0 || text.length > MAX_SHIPPING_CONTEXT_TEXT_LENGTH) {
    return false;
  }

  return hasShippingKeyword(text) || hasShippingKeyword(getElementAttributeBlob(element));
}

function isDedicatedShippingPriceText(text: string): boolean {
  const normalized = normalizeWhitespace(text.toLowerCase());
  return /^(?:free\s+)?(?:shipping|delivery|postage|freight|handling)\b/.test(normalized);
}

function isPriceRangeContext(element: HTMLElement): boolean {
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current !== null && depth <= MAX_RANGE_CONTEXT_DEPTH) {
    const text = getElementText(current);

    if (text.length > 0 && text.length <= MAX_RANGE_CONTEXT_TEXT_LENGTH && isPriceRangeText(text)) {
      return true;
    }

    current = current.parentElement;
    depth += 1;
  }

  return false;
}

function isShippingRelatedElement(element: HTMLElement, text: string, attributeBlob: string): boolean {
  if (SHIPPING_PRICE_SELECTORS.some((selector) => element.matches(selector))) {
    return true;
  }

  if (hasShippingKeyword(text) || hasShippingKeyword(attributeBlob)) {
    return true;
  }

  let current = element.parentElement;
  let depth = 0;

  while (current !== null && depth < MAX_SHIPPING_CONTEXT_DEPTH) {
    const currentElement = current;
    const currentText = getElementText(currentElement);

    if (
      SHIPPING_PRICE_SELECTORS.some((selector) => currentElement.matches(selector)) ||
      (isCompactShippingContext(currentElement) && isDedicatedShippingPriceText(currentText))
    ) {
      return true;
    }

    current = currentElement.parentElement;
    depth += 1;
  }

  return false;
}

function isOriginalPriceElement(element: HTMLElement, attributeBlob: string): boolean {
  if (ORIGINAL_PRICE_SELECTORS.some((selector) => element.matches(selector))) {
    return true;
  }

  if (matchesKeyword(attributeBlob, ORIGINAL_PRICE_KEYWORDS)) {
    return true;
  }

  return hasLineThrough(element);
}

function isFinalPriceElement(attributeBlob: string, element: HTMLElement): boolean {
  if (FINAL_PRICE_SELECTORS.some((selector) => element.matches(selector))) {
    return true;
  }

  return matchesKeyword(attributeBlob, FINAL_PRICE_KEYWORDS);
}

function getAncestors(element: HTMLElement, depth: number): HTMLElement[] {
  const ancestors: HTMLElement[] = [element];
  let current = element.parentElement;

  while (current !== null && ancestors.length <= depth + 1) {
    ancestors.push(current);
    current = current.parentElement;
  }

  return ancestors;
}

function getSharedContainer(left: HTMLElement, right: HTMLElement): HTMLElement | null {
  const rightAncestors = new Set(getAncestors(right, MAX_COMMON_ANCESTOR_DEPTH));

  for (const ancestor of getAncestors(left, MAX_COMMON_ANCESTOR_DEPTH)) {
    if (rightAncestors.has(ancestor)) {
      return ancestor;
    }
  }

  return null;
}

function getCenterDistance(left: DOMRect, right: DOMRect): number {
  const leftCenterX = left.left + left.width / 2;
  const leftCenterY = left.top + left.height / 2;
  const rightCenterX = right.left + right.width / 2;
  const rightCenterY = right.top + right.height / 2;

  return Math.hypot(leftCenterX - rightCenterX, leftCenterY - rightCenterY);
}

function areNearby(left: HTMLElement, right: HTMLElement): boolean {
  if (getSharedContainer(left, right) !== null) {
    return true;
  }

  return getCenterDistance(left.getBoundingClientRect(), right.getBoundingClientRect()) <= MAX_PROXIMITY_PX;
}

function getPairScore(original: PriceCandidate, finalCandidate: PriceCandidate): number {
  const sharedContainer = getSharedContainer(original.element, finalCandidate.element);
  const distance = getCenterDistance(original.boundingBox, finalCandidate.boundingBox);

  return distance + (sharedContainer === null ? 400 : 0) - (finalCandidate.hasFinalHint ? 40 : 0) - finalCandidate.priority * 10;
}

function getLabelDistance(
  label: DiscountLabelCandidate,
  original: PriceCandidate,
  finalCandidate: PriceCandidate,
  container: HTMLElement | null
): number {
  if (container !== null && container.contains(label.element)) {
    return 0;
  }

  const originalDistance = getCenterDistance(label.boundingBox, original.boundingBox);
  const finalDistance = getCenterDistance(label.boundingBox, finalCandidate.boundingBox);
  return Math.min(originalDistance, finalDistance);
}

export function formatNumber(value: number): string {
  return value.toFixed(2);
}

function buildGroupText(group: PriceGroup): string {
  const parts = [`was ${group.original.priceText}`, `now ${group.final.priceText}`];

  if (group.percentageLabel !== null) {
    parts.push(group.percentageLabel.text);
  }

  if (group.absoluteLabel !== null) {
    parts.push(group.absoluteLabel.text);
  }

  return normalizeWhitespace(parts.join(' | ')).slice(0, MAX_EVIDENCE_TEXT_LENGTH);
}

function buildPercentageOnlyGroupText(group: PercentageOnlyGroup): string {
  const parts = [group.percentageLabel.text];

  if (group.final !== null) {
    parts.push(`now ${group.final.priceText}`);
  }

  return normalizeWhitespace(parts.join(' | ')).slice(0, MAX_EVIDENCE_TEXT_LENGTH);
}

function createCandidate(element: HTMLElement, priceText: string, priceValue: number, hasFinalHint: boolean): PriceCandidate {
  return {
    element,
    selector: generateUniqueSelector(element),
    text: getElementText(element),
    priceText,
    priceValue,
    boundingBox: element.getBoundingClientRect(),
    priority: getPriority(element),
    hasFinalHint
  };
}

/**
 * Finds nearby original-price, final-price, and discount-label groups on the live document.
 */
export function findPriceGroups(doc: Document = document): PriceGroupSearchResult {
  if (!(doc.body instanceof HTMLElement)) {
    return {
      groups: [],
      hasAnyPrice: false,
      hasOriginalPrice: false,
      percentageOnlyGroups: []
    };
  }

  const elements = Array.from(doc.body.querySelectorAll('*')).filter(isVisibleElement);
  const originalCandidates: PriceCandidate[] = [];
  const finalCandidates: PriceCandidate[] = [];
  const discountLabels: DiscountLabelCandidate[] = [];
  let hasAnyPrice = false;

  for (const element of elements) {
    const text = getElementText(element);

    if (text.length === 0) {
      continue;
    }

    const parsedDiscount = parseDiscountLabel(text);
    const priceText = extractTextPrice(text);

    if (priceText !== null) {
      if (!isAtomicCandidateElement(element, text)) {
        continue;
      }

      if (extractPriceTokens(text).length !== 1) {
        continue;
      }

      if (containsMatchingPriceDescendant(element, priceText)) {
        continue;
      }

      const parsedPrice = parsePrice(priceText);

      if (isPlausiblePrice(parsedPrice)) {
        hasAnyPrice = true;
        const attributeBlob = getElementAttributeBlob(element);

        if (isShippingRelatedElement(element, text, attributeBlob)) {
          continue;
        }

        if (isPriceRangeContext(element)) {
          continue;
        }

        const isOriginal = isOriginalPriceElement(element, attributeBlob);

        if (isOriginal) {
          originalCandidates.push(createCandidate(element, priceText, parsedPrice, false));
          continue;
        }

        if (parsedDiscount === null || isFinalPriceElement(attributeBlob, element)) {
          finalCandidates.push(createCandidate(element, priceText, parsedPrice, isFinalPriceElement(attributeBlob, element)));
        }
      }
    }

    if (
      parsedDiscount !== null &&
      isAtomicCandidateElement(element, text) &&
      !isPriceRangeContext(element) &&
      !containsMatchingDiscountDescendant(element, parsedDiscount)
    ) {
      discountLabels.push({
        element,
        selector: generateUniqueSelector(element),
        text,
        parsedLabel: parsedDiscount,
        boundingBox: element.getBoundingClientRect()
      });
    }
  }

  const groups: PriceGroup[] = [];
  const usedFinalElements = new Set<HTMLElement>();
  const usedLabelElements = new Set<HTMLElement>();
  const sortedOriginals = originalCandidates
    .slice()
    .sort((left, right) => right.priority - left.priority || left.boundingBox.top - right.boundingBox.top);

  for (const original of sortedOriginals) {
    if (groups.length >= MAX_PRICE_GROUPS) {
      break;
    }

    const finalCandidate = finalCandidates
      .filter(
        (candidate) =>
          !usedFinalElements.has(candidate.element) &&
          candidate.element !== original.element &&
          !candidate.element.contains(original.element) &&
          !original.element.contains(candidate.element) &&
          candidate.priceValue < original.priceValue &&
          areNearby(original.element, candidate.element)
      )
      .sort((left, right) => getPairScore(original, left) - getPairScore(original, right))[0];

    if (finalCandidate === undefined) {
      continue;
    }

    const container = getSharedContainer(original.element, finalCandidate.element);
    const nearbyLabels = discountLabels
      .filter(
        (label) =>
          label.element !== original.element &&
          label.element !== finalCandidate.element &&
          (areNearby(label.element, original.element) ||
            areNearby(label.element, finalCandidate.element) ||
            (container !== null && container.contains(label.element)))
      )
      .sort((left, right) => getLabelDistance(left, original, finalCandidate, container) - getLabelDistance(right, original, finalCandidate, container));

    const percentageLabel = nearbyLabels.find((label) => label.parsedLabel.type === 'percentage') ?? null;
    const absoluteLabel = nearbyLabels.find((label) => label.parsedLabel.type === 'absolute') ?? null;
    const selectorSource = container ?? finalCandidate.element;

    groups.push({
      original,
      final: finalCandidate,
      percentageLabel,
      absoluteLabel,
      container,
      selector: generateUniqueSelector(selectorSource),
      boundingBox: selectorSource.getBoundingClientRect()
    });
    usedFinalElements.add(finalCandidate.element);

    if (percentageLabel !== null) {
      usedLabelElements.add(percentageLabel.element);
    }

    if (absoluteLabel !== null) {
      usedLabelElements.add(absoluteLabel.element);
    }
  }

  const percentageOnlyGroups: PercentageOnlyGroup[] = discountLabels
    .filter(
      (label) =>
        !usedLabelElements.has(label.element) &&
        label.parsedLabel.type === 'percentage' &&
        label.parsedLabel.value > DISCOUNT_THRESHOLD
    )
    .map((label) => {
      const nearbyFinal = finalCandidates
        .filter((candidate) => candidate.element !== label.element && areNearby(label.element, candidate.element))
        .sort((left, right) => getCenterDistance(label.boundingBox, left.boundingBox) - getCenterDistance(label.boundingBox, right.boundingBox))[0];

      return {
        percentageLabel: label,
        final: nearbyFinal ?? null
      };
    });

  return {
    groups,
    hasAnyPrice,
    hasOriginalPrice: originalCandidates.length > 0,
    percentageOnlyGroups
  };
}

/**
 * Evaluates a single full price group for suspicious discount size and inconsistent arithmetic.
 */
export function evaluateGroup(group: PriceGroup): GroupEvaluation | null {
  const originalPrice = group.original.priceValue;
  const finalPrice = group.final.priceValue;

  if (!isPlausiblePrice(originalPrice) || !isPlausiblePrice(finalPrice) || originalPrice === 0 || originalPrice <= finalPrice) {
    return null;
  }

  const impliedDiscount = ((originalPrice - finalPrice) / originalPrice) * 100;
  const percentageValue = group.percentageLabel?.parsedLabel.type === 'percentage' ? group.percentageLabel.parsedLabel.value : null;
  const absoluteValue = group.absoluteLabel?.parsedLabel.type === 'absolute' ? group.absoluteLabel.parsedLabel.value : null;
  const hasSuspiciousPercentage =
    (percentageValue !== null && percentageValue > DISCOUNT_THRESHOLD) || impliedDiscount > DISCOUNT_THRESHOLD;

  let hasMathCheck = false;
  let hasInconsistentMath = false;
  let largeInconsistency = false;
  const inconsistencyDetails: string[] = [];

  if (percentageValue !== null) {
    hasMathCheck = true;

    const expectedFinal = originalPrice * (1 - percentageValue / 100);
    const difference = Math.abs(finalPrice - expectedFinal);
    const tolerance = originalPrice * 0.02;

    if (difference > tolerance) {
      hasInconsistentMath = true;
      largeInconsistency = largeInconsistency || difference > originalPrice * 0.1;
      inconsistencyDetails.push(
        `${formatNumber(percentageValue)}% off ${formatNumber(originalPrice)} implies ${formatNumber(expectedFinal)}, not ${formatNumber(finalPrice)}`
      );
    }
  }

  if (absoluteValue !== null) {
    hasMathCheck = true;

    const expectedFinal = originalPrice - absoluteValue;
    const difference = Math.abs(finalPrice - expectedFinal);

    if (difference > 0.05) {
      hasInconsistentMath = true;
      largeInconsistency = largeInconsistency || difference > originalPrice * 0.1;
      inconsistencyDetails.push(
        `saving ${formatNumber(absoluteValue)} from ${formatNumber(originalPrice)} implies ${formatNumber(expectedFinal)}, not ${formatNumber(finalPrice)}`
      );
    }
  }

  if (!hasSuspiciousPercentage && !hasInconsistentMath) {
    const primaryTarget = getPrimaryFindingTarget(group, false);

    return {
      hasSuspiciousPercentage: false,
      hasInconsistentMath: false,
      hasMathCheck,
      largeInconsistency: false,
      selector: primaryTarget.selector,
      visualSelector: primaryTarget.selector,
      boundingBox: primaryTarget.boundingBox,
      text: buildGroupText(group),
      reason: ''
    };
  }

  const reasonParts: string[] = [];

  if (percentageValue !== null && percentageValue > DISCOUNT_THRESHOLD) {
    reasonParts.push(`displayed discount claims ${formatNumber(percentageValue)}% off`);
  } else if (impliedDiscount > DISCOUNT_THRESHOLD) {
    reasonParts.push(`displayed prices imply ${formatNumber(impliedDiscount)}% off`);
  }

  if (inconsistencyDetails.length > 0) {
    reasonParts.push(...inconsistencyDetails);
  }

  const primaryTarget = getPrimaryFindingTarget(group, hasSuspiciousPercentage);
  const groupedVisualTarget = resolveGroupedVisualTarget(group, hasSuspiciousPercentage, hasInconsistentMath);

  return {
    hasSuspiciousPercentage,
    hasInconsistentMath,
    hasMathCheck,
    largeInconsistency,
    selector: primaryTarget.selector,
    visualSelector: generateUniqueSelector(groupedVisualTarget),
    boundingBox: groupedVisualTarget.getBoundingClientRect(),
    text: buildGroupText(group),
    reason: reasonParts.join('; ')
  };
}

/**
 * Evaluates a percentage-only group when the page exposes a strong discount label without a usable original-price pair.
 */
export function evaluatePercentageOnlyGroup(group: PercentageOnlyGroup): GroupEvaluation {
  const visualTarget = resolvePercentageOnlyVisualTarget(group);
  const percentageValue = group.percentageLabel.parsedLabel.value;

  return {
    hasSuspiciousPercentage: true,
    hasInconsistentMath: false,
    hasMathCheck: false,
    largeInconsistency: false,
    selector: group.percentageLabel.selector,
    visualSelector: generateUniqueSelector(visualTarget),
    boundingBox: visualTarget.getBoundingClientRect(),
    text: buildPercentageOnlyGroupText(group),
    reason: `displayed discount claims ${formatNumber(percentageValue)}% off`
  };
}

