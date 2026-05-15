import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import { FINAL_PRICE_SELECTORS, ORIGINAL_PRICE_SELECTORS } from '../K-16/constants';
import { parsePrice } from '../K-16/parsing';
import {
  DEPRIORITIZED_CONTAINER_SELECTOR,
  EXCLUDED_CONTAINER_SELECTOR,
  FILTER_CONTAINER_SELECTOR,
  MAX_CARD_ANCESTOR_DEPTH,
  MAX_CANDIDATE_ROOTS_PER_CONTAINER,
  MAX_CONTAINER_CANDIDATES,
  MAX_DESCENDANT_SCAN,
  MAX_EVIDENCE_TEXT_LENGTH,
  MAX_GROUP_DESCENDANT_SCAN,
  MAX_GROUP_OPTIONS,
  MAX_GROUPS,
  MAX_INLINE_PRICE_CONTEXT_LENGTH,
  MAX_PRICE_TEXT_LENGTH,
  MIN_GROUP_OPTIONS,
  PRICE_DISPLAY_SELECTORS,
  PRIORITY_ROOT_SELECTOR,
  PRODUCT_CARD_HINT_SELECTORS,
  SIZE_RATIO_THRESHOLD,
  WEIGHT_THRESHOLDS
} from './constants';
import { BiasClassification, CardFinding, CardMeasurement, CheapestBaseline, ProductCard, ProductGroup, PriceData } from './types';

const PRICE_TOKEN_PATTERN =
  /(?:\$|\u20AC|\u00A3|\u00A5|kr|z\u0142)\s*-?\d[\d\s.,]*|-?\d[\d\s.,]*\s*(?:\$|\u20AC|\u00A3|\u00A5|kr|z\u0142)/i;

let elementTextCache = new WeakMap<HTMLElement, string>();
let attributeBlobCache = new WeakMap<HTMLElement, string>();
let visibilityCache = new WeakMap<HTMLElement, boolean>();
let rectCache = new WeakMap<HTMLElement, DOMRect>();
let computedStyleCache = new WeakMap<HTMLElement, CSSStyleDeclaration>();
let priceLikeContentCache = new WeakMap<HTMLElement, boolean>();
let atomicUnitCache = new WeakMap<HTMLElement, boolean>();
let productSummaryShapeCache = new WeakMap<HTMLElement, boolean>();
let nestedAtomicUnitsCache = new WeakMap<HTMLElement, HTMLElement[]>();
let multipleProductUnitsCache = new WeakMap<HTMLElement, boolean>();
let multipleNestedProductUnitsCache = new WeakMap<HTMLElement, boolean>();
let likelyProductCardCache = new WeakMap<HTMLElement, boolean>();
let priceDataCache = new WeakMap<HTMLElement, PriceData | null>();
let productCardCache = new WeakMap<HTMLElement, ProductCard | null>();
let candidateCardRootsCache = new WeakMap<HTMLElement, HTMLElement[]>();

function resetProbeCaches(): void {
  elementTextCache = new WeakMap<HTMLElement, string>();
  attributeBlobCache = new WeakMap<HTMLElement, string>();
  visibilityCache = new WeakMap<HTMLElement, boolean>();
  rectCache = new WeakMap<HTMLElement, DOMRect>();
  computedStyleCache = new WeakMap<HTMLElement, CSSStyleDeclaration>();
  priceLikeContentCache = new WeakMap<HTMLElement, boolean>();
  atomicUnitCache = new WeakMap<HTMLElement, boolean>();
  productSummaryShapeCache = new WeakMap<HTMLElement, boolean>();
  nestedAtomicUnitsCache = new WeakMap<HTMLElement, HTMLElement[]>();
  multipleProductUnitsCache = new WeakMap<HTMLElement, boolean>();
  multipleNestedProductUnitsCache = new WeakMap<HTMLElement, boolean>();
  likelyProductCardCache = new WeakMap<HTMLElement, boolean>();
  priceDataCache = new WeakMap<HTMLElement, PriceData | null>();
  productCardCache = new WeakMap<HTMLElement, ProductCard | null>();
  candidateCardRootsCache = new WeakMap<HTMLElement, HTMLElement[]>();
}

function getComputedStyleCached(element: HTMLElement): CSSStyleDeclaration {
  const cached = computedStyleCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const style = window.getComputedStyle(element);
  computedStyleCache.set(element, style);
  return style;
}

function getBoundingClientRectCached(element: HTMLElement): DOMRect {
  const cached = rectCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const rect = element.getBoundingClientRect();
  rectCache.set(element, rect);
  return rect;
}

function getElementText(element: HTMLElement): string {
  const cached = elementTextCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const text = normalizeWhitespace(
    [element.textContent ?? '', element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? '']
      .filter((value) => value.length > 0)
      .join(' ')
  );

  elementTextCache.set(element, text);
  return text;
}

function getAttributeBlob(element: HTMLElement): string {
  const cached = attributeBlobCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const attributes = Array.from(element.attributes).map((attribute) => `${attribute.name} ${attribute.value}`);

  const blob = normalizeWhitespace(
    [element.id, typeof element.className === 'string' ? element.className : '', ...attributes]
      .filter((value) => value.length > 0)
      .join(' ')
      .toLowerCase()
  );

  attributeBlobCache.set(element, blob);
  return blob;
}

function isVisibleElement(element: Element): element is HTMLElement {
  if (
    !(element instanceof HTMLElement) ||
    !element.isConnected ||
    element.closest(EXCLUDED_CONTAINER_SELECTOR) !== null ||
    element.closest(FILTER_CONTAINER_SELECTOR) !== null
  ) {
    return false;
  }

  const cached = visibilityCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const style = getComputedStyleCached(element);
  const rect = getBoundingClientRectCached(element);
  const visible =
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0 &&
    rect.width > 0 &&
    rect.height > 0;

  visibilityCache.set(element, visible);
  return visible;
}

function getPriceToken(text: string): string | null {
  const match = normalizeWhitespace(text).match(PRICE_TOKEN_PATTERN);
  return match?.[0] ?? null;
}

function hasPriceLikeContent(element: HTMLElement): boolean {
  const cached = priceLikeContentCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const descendants = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*')).slice(0, MAX_DESCENDANT_SCAN)];

  const hasPrice = descendants.some((candidate) => {
    if (!isVisibleElement(candidate)) {
      return false;
    }

    const text = getElementText(candidate);
    return text.length > 0 && text.length <= MAX_PRICE_TEXT_LENGTH && getPriceToken(text) !== null;
  });

  priceLikeContentCache.set(element, hasPrice);
  return hasPrice;
}

function hasOptionCardHint(element: HTMLElement): boolean {
  const attributeBlob = getAttributeBlob(element);
  return (
    PRODUCT_CARD_HINT_SELECTORS.some((selector) => element.matches(selector)) ||
    /product|plan|tier|option|package|bundle|pricing/.test(attributeBlob)
  );
}

function hasCardStructureSignals(element: HTMLElement): boolean {
  const hasImage = element.querySelector('img, picture, svg') !== null;
  const hasHeading = element.querySelector('h1, h2, h3, h4, [role="heading"]') !== null;
  const hasLinkOrButton = element.querySelector('a[href], button, [role="button"]') !== null;

  return hasImage || hasHeading || hasLinkOrButton || hasOptionCardHint(element);
}

function isAtomicPricedVisualUnit(element: HTMLElement): boolean {
  const cached = atomicUnitCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  if (!isVisibleElement(element)) {
    atomicUnitCache.set(element, false);
    return false;
  }

  const rect = getBoundingClientRectCached(element);
  const hasLinkOrButton = element.querySelector('a[href], button, [role="button"]') !== null;
  const text = getElementText(element);

  const result =
    hasPriceLikeContent(element) &&
    hasCardStructureSignals(element) &&
    rect.width > 80 &&
    rect.height > 80 &&
    text.length > 0 &&
    text.length <= MAX_EVIDENCE_TEXT_LENGTH &&
    hasLinkOrButton;

  atomicUnitCache.set(element, result);
  return result;
}

function hasProductSummaryShape(element: HTMLElement): boolean {
  const cached = productSummaryShapeCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  if (!isVisibleElement(element)) {
    productSummaryShapeCache.set(element, false);
    return false;
  }

  const rect = getBoundingClientRectCached(element);
  const hasHeading = element.querySelector('h1, h2, h3, h4, [role="heading"]') !== null;
  const hasLinkOrButton = element.querySelector('a[href], button, [role="button"]') !== null;
  const text = getElementText(element);

  const result =
    hasPriceLikeContent(element) &&
    hasCardStructureSignals(element) &&
    (hasLinkOrButton || hasHeading) &&
    rect.width >= 140 &&
    rect.height >= 140 &&
    text.length >= 20;

  productSummaryShapeCache.set(element, result);
  return result;
}

function getDepthRelativeToAncestor(element: HTMLElement, ancestor: HTMLElement): number {
  let depth = 0;
  let current: HTMLElement | null = element;

  while (current !== null && current !== ancestor) {
    depth += 1;
    current = current.parentElement;
  }

  return current === ancestor ? depth : Number.POSITIVE_INFINITY;
}

function hasMultipleProductUnits(element: HTMLElement): boolean {
  const cached = multipleProductUnitsCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  let count = 0;

  for (const child of Array.from(element.children)) {
    if (isVisibleElement(child) && isAtomicPricedVisualUnit(child)) {
      count += 1;

      if (count >= 2) {
        multipleProductUnitsCache.set(element, true);
        return true;
      }
    }
  }

  multipleProductUnitsCache.set(element, false);
  return false;
}

function collectNestedAtomicUnits(element: HTMLElement): HTMLElement[] {
  const cached = nestedAtomicUnitsCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const nestedProductUnits = Array.from(element.querySelectorAll<HTMLElement>('*'))
    .filter((candidate) => candidate !== element)
    .filter(isVisibleElement)
    .filter((candidate) => getDepthRelativeToAncestor(candidate, element) <= 4)
    .filter((candidate) => isAtomicPricedVisualUnit(candidate));

  const uniqueUnits = nestedProductUnits.filter((candidate, index, allCandidates) => {
    return !allCandidates.some(
      (otherCandidate, otherIndex) => otherIndex !== index && otherCandidate.contains(candidate) && otherCandidate !== candidate
    );
  });

  nestedAtomicUnitsCache.set(element, uniqueUnits);
  return uniqueUnits;
}

function hasMultipleNestedProductUnits(element: HTMLElement): boolean {
  const cached = multipleNestedProductUnitsCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const result = collectNestedAtomicUnits(element).length >= 2;
  multipleNestedProductUnitsCache.set(element, result);
  return result;
}

function getExtraTokenTextLength(text: string, token: string): number {
  const normalizedText = normalizeWhitespace(text);

  if (!normalizedText.includes(token)) {
    return normalizedText.length;
  }

  return normalizedText.replace(token, '').trim().length;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hasExplicitPricePresentationHint(element: HTMLElement, attributeBlob: string): boolean {
  return (
    PRICE_DISPLAY_SELECTORS.some((selector) => element.matches(selector)) ||
    FINAL_PRICE_SELECTORS.some((selector) => element.matches(selector)) ||
    /\b(price|sale|final|now|member|regular|original|msrp|rrp)\b/.test(attributeBlob)
  );
}

function isPromotionalThresholdPriceText(text: string, token: string): boolean {
  const normalizedText = normalizeWhitespace(text).toLowerCase();
  const normalizedToken = normalizeWhitespace(token).toLowerCase();
  const escapedToken = escapeRegExp(normalizedToken);

  return new RegExp(`\\b(under|below|less than|up to|starting at|starts at|as low as|from)\\b\\s*${escapedToken}`).test(
    normalizedText
  );
}

function collectPriceTextCandidates(cardElement: HTMLElement, token: string): HTMLElement[] {
  return [cardElement, ...Array.from(cardElement.querySelectorAll<HTMLElement>('*')).slice(0, MAX_DESCENDANT_SCAN)]
    .filter(isVisibleElement)
    .filter((candidate) => normalizeWhitespace(getElementText(candidate)).includes(token));
}

function scorePriceDisplayElement(cardElement: HTMLElement, candidate: HTMLElement, token: string): number {
  if (!isVisibleElement(candidate)) {
    return Number.NEGATIVE_INFINITY;
  }

  const style = getComputedStyleCached(candidate);
  const rect = getBoundingClientRectCached(candidate);
  const text = getElementText(candidate);
  const attributeBlob = getAttributeBlob(candidate);
  const fontSize = Number.parseFloat(style.fontSize || '0');
  const fontWeight = parseFontWeight(style.fontWeight);
  const area = rect.width * rect.height;
  const normalizedText = normalizeWhitespace(text);
  const containsToken = normalizedText.includes(token);
  const hasExactTokenText = normalizedText === token;
  const hasPriceSelectorMatch = PRICE_DISPLAY_SELECTORS.some((selector) => candidate.matches(selector));
  const hasFinalPriceHint =
    FINAL_PRICE_SELECTORS.some((selector) => candidate.matches(selector)) || /current|sale|final|now|price/.test(attributeBlob);
  const hasOriginalPriceHint =
    ORIGINAL_PRICE_SELECTORS.some((selector) => candidate.matches(selector)) ||
    style.textDecorationLine.includes('line-through') ||
    style.textDecoration.includes('line-through') ||
    /original|old-price|list-price|regular|before|compare|strike|msrp|rrp/.test(attributeBlob);
  const hasInlineStyle = (candidate.getAttribute('style') ?? '').length > 0;
  const hasTextShadow = normalizeWhitespace(style.textShadow.toLowerCase()) !== 'none';
  const isInsideCard = candidate === cardElement || cardElement.contains(candidate);
  const extraTextLength = getExtraTokenTextLength(text, token);
  const nestedMatchingPriceDescendants = Array.from(candidate.querySelectorAll<HTMLElement>('*'))
    .slice(0, MAX_DESCENDANT_SCAN)
    .filter((descendant) => descendant !== candidate)
    .filter(isVisibleElement)
    .filter((descendant) => normalizeWhitespace(getElementText(descendant)).includes(token)).length;
  const compactArea = Math.min(area, 2500);

  return (
    compactArea +
    fontSize * 180 +
    fontWeight * 2 +
    (containsToken ? 3000 : 0) +
    (hasExactTokenText ? 7000 : 0) +
    (hasPriceSelectorMatch ? 1800 : 0) +
    (hasFinalPriceHint ? 5000 : 0) +
    (hasInlineStyle ? 1500 : 0) +
    (hasTextShadow ? 1000 : 0) +
    (isInsideCard ? 500 : 0) -
    extraTextLength * 140 -
    nestedMatchingPriceDescendants * 4500 -
    (hasOriginalPriceHint ? 6000 : 0)
  );
}

function resolvePriceDisplayElement(cardElement: HTMLElement, priceElement: HTMLElement, token: string): HTMLElement {
  const candidates = new Map<HTMLElement, number>();
  let current: HTMLElement | null = priceElement;

  while (current !== null && current !== cardElement) {
    candidates.set(current, scorePriceDisplayElement(cardElement, current, token));
    current = current.parentElement;
  }

  candidates.set(cardElement, scorePriceDisplayElement(cardElement, cardElement, token));

  for (const descendant of collectPriceTextCandidates(cardElement, token)) {
    candidates.set(descendant, scorePriceDisplayElement(cardElement, descendant, token));
  }

  const selector = PRICE_DISPLAY_SELECTORS.join(', ');
  for (const descendant of Array.from(cardElement.querySelectorAll<HTMLElement>(selector))) {
    if (descendant === priceElement || descendant.contains(priceElement) || priceElement.contains(descendant)) {
      candidates.set(descendant, scorePriceDisplayElement(cardElement, descendant, token));
    }
  }

  let bestCandidate: HTMLElement | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const [candidate, score] of candidates.entries()) {
    if (score > bestScore) {
      bestCandidate = candidate;
      bestScore = score;
    }
  }

  return bestCandidate ?? priceElement;
}

function extractPriceData(element: HTMLElement): PriceData | null {
  const cached = priceDataCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  const descendants = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*')).slice(0, MAX_DESCENDANT_SCAN)];
  const candidates: Array<{ element: HTMLElement; displayElement: HTMLElement; token: string; score: number }> = [];

  for (const candidate of descendants) {
    if (!isVisibleElement(candidate)) {
      continue;
    }

    const text = getElementText(candidate);

    if (text.length === 0 || text.length > MAX_PRICE_TEXT_LENGTH) {
      continue;
    }

    const token = getPriceToken(text);

    if (token === null) {
      continue;
    }

    const value = parsePrice(token);

    if (value === null) {
      continue;
    }

    const displayElement = resolvePriceDisplayElement(element, candidate, normalizeWhitespace(token));
    const displayRect = getBoundingClientRectCached(displayElement);
    const displayStyle = getComputedStyleCached(displayElement);
    const attributeBlob = getAttributeBlob(displayElement);
    const fontSize = Number.parseFloat(displayStyle.fontSize || '0');
    const area = Math.min(displayRect.width * displayRect.height, 2500);
    const displayText = getElementText(displayElement);
    const normalizedToken = normalizeWhitespace(token);
    const normalizedDisplayText = normalizeWhitespace(displayText);
    const extraTextLength = getExtraTokenTextLength(displayText, normalizedToken);
    const exactTokenText = normalizedDisplayText === normalizedToken;
    const hasFinalPriceHint =
      FINAL_PRICE_SELECTORS.some((selector) => displayElement.matches(selector)) || /current|sale|final|now|price/.test(attributeBlob);
    const hasOriginalPriceHint =
      ORIGINAL_PRICE_SELECTORS.some((selector) => displayElement.matches(selector)) ||
      displayStyle.textDecorationLine.includes('line-through') ||
      displayStyle.textDecoration.includes('line-through') ||
      /original|old-price|list-price|regular|before|compare|strike|msrp|rrp/.test(attributeBlob);
    const hasExplicitPriceHint = hasExplicitPricePresentationHint(displayElement, attributeBlob);
    const isCompactInlinePrice = exactTokenText || extraTextLength <= MAX_INLINE_PRICE_CONTEXT_LENGTH;
    const isPromotionalThresholdPrice = isPromotionalThresholdPriceText(normalizedDisplayText, normalizedToken);

    if (isPromotionalThresholdPrice || (!hasExplicitPriceHint && !isCompactInlinePrice)) {
      continue;
    }

    const nestedMatchingPriceDescendants = Array.from(displayElement.querySelectorAll<HTMLElement>('*'))
      .slice(0, MAX_DESCENDANT_SCAN)
      .filter(isVisibleElement)
      .filter((descendant) => normalizeWhitespace(getElementText(descendant)).includes(normalizedToken)).length;
    const score =
      area +
      fontSize * 60 +
      (exactTokenText ? 5000 : 0) +
      (hasFinalPriceHint ? 5000 : 0) -
      extraTextLength * 120 -
      nestedMatchingPriceDescendants * 4000 -
      (hasOriginalPriceHint ? 5000 : 0);

    candidates.push({
      element: candidate,
      displayElement,
      token: normalizedToken,
      score
    });
  }

  let bestCandidate: { element: HTMLElement; displayElement: HTMLElement; token: string; score: number } | undefined;

  for (const candidate of candidates) {
    if (bestCandidate === undefined || candidate.score > bestCandidate.score) {
      bestCandidate = candidate;
    }
  }

  if (bestCandidate === undefined) {
    priceDataCache.set(element, null);
    return null;
  }

  const parsedValue = parsePrice(bestCandidate.token);

  if (parsedValue === null) {
    priceDataCache.set(element, null);
    return null;
  }

  const priceData = {
    element: bestCandidate.element,
    displayElement: bestCandidate.displayElement,
    text: bestCandidate.token,
    value: parsedValue
  };

  priceDataCache.set(element, priceData);
  return priceData;
}

function getContainerPriority(element: HTMLElement): number {
  if (element.closest(DEPRIORITIZED_CONTAINER_SELECTOR) !== null) {
    return 0;
  }

  if (element.closest(PRIORITY_ROOT_SELECTOR) !== null) {
    return 2;
  }

  return 1;
}

function isLikelyProductCard(element: HTMLElement): boolean {
  const cached = likelyProductCardCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  if (!isVisibleElement(element)) {
    likelyProductCardCache.set(element, false);
    return false;
  }

  if (element.querySelector('input[type="checkbox"], [role="checkbox"]') !== null) {
    likelyProductCardCache.set(element, false);
    return false;
  }

  const hasHeading = element.querySelector('h1, h2, h3, h4, [role="heading"]') !== null;
  const hasLinkOrButton = element.querySelector('a[href], button, [role="button"]') !== null;
  const hasProductSummary = hasProductSummaryShape(element);

  const result =
    (hasPriceLikeContent(element) && hasCardStructureSignals(element) && (hasHeading || hasLinkOrButton || hasOptionCardHint(element))) ||
    hasProductSummary;
  likelyProductCardCache.set(element, result);
  return result;
}

function scoreCardAnchor(element: HTMLElement, price: PriceData): number {
  const rect = getBoundingClientRectCached(element);
  const area = rect.width * rect.height;
  const text = getElementText(element);
  const hasHeading = element.querySelector('h1, h2, h3, h4, [role="heading"]') !== null;
  const hasLink = element.querySelector('a[href]') !== null;
  const hasImage = element.querySelector('img, picture, svg') !== null;
  const hasPriceSelector = PRICE_DISPLAY_SELECTORS.some((selector) => {
    return element.querySelector(selector) !== null || element.matches(selector);
  });
  const textScore = Math.min(text.length, MAX_EVIDENCE_TEXT_LENGTH);

  return (
    area +
    textScore * 30 +
    (hasHeading ? 3000 : 0) +
    (hasLink ? 1500 : 0) +
    (hasImage ? 1500 : 0) +
    (hasPriceSelector ? 1500 : 0) +
    (element.contains(price.displayElement) ? 1000 : 0) +
    (element === price.displayElement ? -4000 : 0) +
    (rect.width < 120 || rect.height < 120 ? -3000 : 0)
  );
}

function resolveProductCardAnchor(element: HTMLElement, price: PriceData): HTMLElement {
  const candidates: HTMLElement[] = [];
  let current: HTMLElement | null = element;
  let depth = 0;

  while (current !== null && depth <= MAX_CARD_ANCESTOR_DEPTH) {
    if (
      isVisibleElement(current) &&
      current.contains(price.displayElement) &&
      (isLikelyProductCard(current) || hasProductSummaryShape(current)) &&
      !hasMultipleProductUnits(current) &&
      !hasMultipleNestedProductUnits(current)
    ) {
      candidates.push(current);
    }

    current = current.parentElement;
    depth += 1;
  }

  let bestCandidate: HTMLElement | null = null;
  let bestScore = Number.NEGATIVE_INFINITY;

  for (const candidate of candidates) {
    const score = scoreCardAnchor(candidate, price);

    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate ?? element;
}

function buildProductCard(element: HTMLElement): ProductCard | null {
  const cached = productCardCache.get(element);

  if (cached !== undefined) {
    return cached;
  }

  if (!isLikelyProductCard(element)) {
    productCardCache.set(element, null);
    return null;
  }

  if (hasMultipleProductUnits(element) || hasMultipleNestedProductUnits(element)) {
    productCardCache.set(element, null);
    return null;
  }

  const price = extractPriceData(element);

  if (price === null) {
    productCardCache.set(element, null);
    return null;
  }

  const anchoredElement = resolveProductCardAnchor(element, price);

  const card = {
    element: anchoredElement,
    selector: generateUniqueSelector(anchoredElement),
    text: getElementText(anchoredElement).slice(0, MAX_EVIDENCE_TEXT_LENGTH),
    price,
    boundingBox: getBoundingClientRectCached(anchoredElement)
  };

  productCardCache.set(element, card);
  return card;
}

function chunkCards(cards: ProductCard[], chunkSize: number): ProductCard[][] {
  const chunks: ProductCard[][] = [];

  for (let index = 0; index < cards.length; index += chunkSize) {
    chunks.push(cards.slice(index, index + chunkSize));
  }

  return chunks;
}

function collectRelevantContainers(doc: Document): HTMLElement[] {
  const rootCandidates = new Set<HTMLElement>();
  const baseContainers = Array.from(
    doc.body.querySelectorAll<HTMLElement>('main, [role="main"], section, ul, ol, [class*="results"], [class*="products"], [class*="listing"]')
  );
  const hintedElements = Array.from(doc.body.querySelectorAll<HTMLElement>(PRODUCT_CARD_HINT_SELECTORS.join(', '))).slice(
    0,
    MAX_GROUP_DESCENDANT_SCAN
  );
  const pricedElements = Array.from(doc.body.querySelectorAll<HTMLElement>(PRICE_DISPLAY_SELECTORS.join(', '))).slice(
    0,
    MAX_GROUP_DESCENDANT_SCAN
  );

  for (const container of baseContainers) {
    rootCandidates.add(container);
  }

  for (const element of [...hintedElements, ...pricedElements]) {
    let current: HTMLElement | null = element;
    let depth = 0;

    while (current !== null && current !== doc.body && depth <= MAX_CARD_ANCESTOR_DEPTH + 3) {
      if (current.matches('main, [role="main"], section, ul, ol, div')) {
        rootCandidates.add(current);
      }

      current = current.parentElement;
      depth += 1;
    }
  }

  return Array.from(rootCandidates)
    .filter(isVisibleElement)
    .sort((left, right) => {
      if (getContainerPriority(left) !== getContainerPriority(right)) {
        return getContainerPriority(right) - getContainerPriority(left);
      }

      return getBoundingClientRectCached(left).top - getBoundingClientRectCached(right).top;
    })
    .slice(0, MAX_CONTAINER_CANDIDATES);
}

function collectCandidateCardRoots(container: HTMLElement): HTMLElement[] {
  const cached = candidateCardRootsCache.get(container);

  if (cached !== undefined) {
    return cached;
  }

  const directChildren = Array.from(container.children).filter(isVisibleElement);
  const directCardLikeChildren = directChildren.filter((child) => {
    return (
      hasOptionCardHint(child) ||
      hasPriceLikeContent(child) ||
      child.querySelector(PRICE_DISPLAY_SELECTORS.join(', ')) !== null
    );
  });

  if (directCardLikeChildren.length >= MIN_GROUP_OPTIONS) {
    const directResult = directCardLikeChildren.slice(0, MAX_CANDIDATE_ROOTS_PER_CONTAINER);
    candidateCardRootsCache.set(container, directResult);
    return directResult;
  }

  const descendantHints = Array.from(container.querySelectorAll<HTMLElement>(PRODUCT_CARD_HINT_SELECTORS.join(', ')))
    .slice(0, MAX_GROUP_DESCENDANT_SCAN)
    .filter(isVisibleElement);
  const priceSelector = PRICE_DISPLAY_SELECTORS.join(', ');
  const priceAncestors = Array.from(container.querySelectorAll<HTMLElement>(priceSelector))
    .slice(0, MAX_GROUP_DESCENDANT_SCAN)
    .filter(isVisibleElement)
    .map((priceElement) => {
      let current: HTMLElement | null = priceElement;
      let depth = 0;

      while (current !== null && current !== container && depth <= MAX_CARD_ANCESTOR_DEPTH + 2) {
        if (isLikelyProductCard(current) || hasProductSummaryShape(current)) {
          return current;
        }

        current = current.parentElement;
        depth += 1;
      }

      return null;
    })
    .filter((element): element is HTMLElement => element !== null);

  const dedupedRoots = Array.from(new Set([...directChildren, ...descendantHints, ...priceAncestors])).slice(
    0,
    MAX_CANDIDATE_ROOTS_PER_CONTAINER
  );
  candidateCardRootsCache.set(container, dedupedRoots);
  return dedupedRoots;
}

function getCenterDistance(left: DOMRect, right: DOMRect): number {
  const leftCenterX = left.left + left.width / 2;
  const leftCenterY = left.top + left.height / 2;
  const rightCenterX = right.left + right.width / 2;
  const rightCenterY = right.top + right.height / 2;

  return Math.hypot(leftCenterX - rightCenterX, leftCenterY - rightCenterY);
}

function getHorizontalGap(left: DOMRect, right: DOMRect): number {
  return Math.max(0, Math.max(left.left - right.right, right.left - left.right));
}

function getVerticalGap(left: DOMRect, right: DOMRect): number {
  return Math.max(0, Math.max(left.top - right.bottom, right.top - left.bottom));
}

function getHorizontalOverlapRatio(left: DOMRect, right: DOMRect): number {
  const overlap = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  return overlap / Math.max(1, Math.min(left.width, right.width));
}

function getVerticalOverlapRatio(left: DOMRect, right: DOMRect): number {
  const overlap = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return overlap / Math.max(1, Math.min(left.height, right.height));
}

function isSameRow(left: ProductCard, right: ProductCard): boolean {
  return getVerticalOverlapRatio(left.boundingBox, right.boundingBox) >= 0.4;
}

function isSameColumn(left: ProductCard, right: ProductCard): boolean {
  return getHorizontalOverlapRatio(left.boundingBox, right.boundingBox) >= 0.5;
}

function hasSimilarCardSize(left: ProductCard, right: ProductCard): boolean {
  const widthRatio = left.boundingBox.width / Math.max(right.boundingBox.width, 1);
  const heightRatio = left.boundingBox.height / Math.max(right.boundingBox.height, 1);

  return widthRatio >= 0.6 && widthRatio <= 1.67 && heightRatio >= 0.6 && heightRatio <= 1.67;
}

function getCardDistance(left: ProductCard, right: ProductCard): number {
  return getCenterDistance(left.boundingBox, right.boundingBox);
}

function isComparablePeer(target: ProductCard, candidate: ProductCard): boolean {
  if (target.selector === candidate.selector) {
    return false;
  }

  if (!hasSimilarCardSize(target, candidate)) {
    return false;
  }

  if (isSameRow(target, candidate)) {
    return getHorizontalGap(target.boundingBox, candidate.boundingBox) <= Math.max(target.boundingBox.width, candidate.boundingBox.width) * 3.5;
  }

  if (isSameColumn(target, candidate)) {
    return getVerticalGap(target.boundingBox, candidate.boundingBox) <= Math.max(target.boundingBox.height, candidate.boundingBox.height) * 3;
  }

  return getCardDistance(target, candidate) <= Math.max(target.boundingBox.width, target.boundingBox.height) * 4;
}

function getPeerPriority(target: ProductCard, candidate: ProductCard): number {
  let score = 0;

  if (target.element.parentElement !== null && target.element.parentElement === candidate.element.parentElement) {
    score += 4;
  }

  if (isSameRow(target, candidate)) {
    score += 3;
  }

  if (isSameColumn(target, candidate)) {
    score += 2;
  }

  if (candidate.price.value < target.price.value) {
    score += 2;
  }

  score -= getCardDistance(target, candidate) / Math.max(Math.max(target.boundingBox.width, target.boundingBox.height), 1);

  return score;
}

function pruneNestedCards(cards: ProductCard[]): ProductCard[] {
  return cards.filter((card, index, allCards) => {
    return !allCards.some((otherCard, otherIndex) => {
      if (index === otherIndex) {
        return false;
      }

      return card.element.contains(otherCard.element);
    });
  });
}

function parseFontWeight(value: string): number {
  if (value === 'bold') {
    return 700;
  }

  if (value === 'normal') {
    return 400;
  }

  const parsed = Number.parseInt(value, 10);
  return Number.isFinite(parsed) ? parsed : 400;
}

function parseMaxBorderWidth(style: CSSStyleDeclaration): number {
  const widths = [style.borderTopWidth, style.borderRightWidth, style.borderBottomWidth, style.borderLeftWidth]
    .map((value) => Number.parseFloat(value || '0'))
    .filter((value) => Number.isFinite(value));

  return widths.length > 0 ? Math.max(...widths) : 0;
}

function normalizeColor(color: string): string {
  return normalizeWhitespace(color.toLowerCase());
}

function parseColorChannels(color: string): [number, number, number] | null {
  const normalized = normalizeColor(color);
  const rgbMatch = normalized.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);

  if (rgbMatch !== null) {
    return [Number.parseInt(rgbMatch[1], 10), Number.parseInt(rgbMatch[2], 10), Number.parseInt(rgbMatch[3], 10)];
  }

  const hexMatch = normalized.match(/#([a-f0-9]{2})([a-f0-9]{2})([a-f0-9]{2})/i);

  if (hexMatch !== null) {
    return [Number.parseInt(hexMatch[1], 16), Number.parseInt(hexMatch[2], 16), Number.parseInt(hexMatch[3], 16)];
  }

  return null;
}

function getColorDistance(left: string, right: string): number | null {
  const leftChannels = parseColorChannels(left);
  const rightChannels = parseColorChannels(right);

  if (leftChannels === null || rightChannels === null) {
    return null;
  }

  return Math.hypot(
    leftChannels[0] - rightChannels[0],
    leftChannels[1] - rightChannels[1],
    leftChannels[2] - rightChannels[2]
  );
}

function areColorsUniform(colors: string[], tolerance = 24): boolean {
  if (colors.length <= 1) {
    return true;
  }

  const comparableColors = colors.filter((color) => parseColorChannels(color) !== null);

  if (comparableColors.length <= 1) {
    return true;
  }

  const reference = comparableColors[0];
  return comparableColors.every((color) => {
    const distance = getColorDistance(reference, color);
    return distance !== null && distance <= tolerance;
  });
}

function hasMeaningfullyDifferentColor(targetColor: string, baselineColors: string[], tolerance = 48): boolean {
  if (baselineColors.length === 0 || !areColorsUniform(baselineColors)) {
    return false;
  }

  const distances = baselineColors
    .map((baselineColor) => getColorDistance(targetColor, baselineColor))
    .filter((distance): distance is number => distance !== null);

  if (distances.length === 0) {
    return baselineColors.every((baselineColor) => baselineColor !== targetColor);
  }

  return Math.min(...distances) >= tolerance;
}

function isTransparentOrWhite(color: string): boolean {
  const normalized = normalizeColor(color);
  return (
    normalized === 'transparent' ||
    normalized === 'rgba(0, 0, 0, 0)' ||
    normalized === 'rgba(0,0,0,0)' ||
    normalized === 'rgb(255, 255, 255)' ||
    normalized === 'rgb(255,255,255)' ||
    normalized === 'rgba(255, 255, 255, 0)' ||
    normalized === 'rgba(255,255,255,0)' ||
    normalized === 'rgba(255, 255, 255, 1)' ||
    normalized === 'rgba(255,255,255,1)'
  );
}

function getAverage(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function buildVisualBaseline(cards: ProductCard[]): CheapestBaseline | null {
  if (cards.length === 0) {
    return null;
  }

  return {
    cards,
    averageArea: getAverage(cards.map((card) => card.boundingBox.width * card.boundingBox.height)),
    averageWidth: getAverage(cards.map((card) => card.boundingBox.width)),
    averageHeight: getAverage(cards.map((card) => card.boundingBox.height)),
    averagePriceFontSize: getAverage(
      cards.map((card) => Number.parseFloat(getComputedStyleCached(card.price.displayElement).fontSize || '0'))
    ),
    averagePriceFontWeight: getAverage(
      cards.map((card) => parseFontWeight(getComputedStyleCached(card.price.displayElement).fontWeight))
    ),
    averagePriceDisplayArea: getAverage(
      cards.map((card) => {
        const rect = getBoundingClientRectCached(card.price.displayElement);
        return rect.width * rect.height;
      })
    ),
    averagePriceDisplayHeight: getAverage(cards.map((card) => getBoundingClientRectCached(card.price.displayElement).height)),
    backgroundColors: cards.map((card) => normalizeColor(getComputedStyleCached(card.element).backgroundColor)),
    maxBorderWidth: Math.max(...cards.map((card) => parseMaxBorderWidth(getComputedStyleCached(card.element))), 0),
    priceColors: cards.map((card) => normalizeColor(getComputedStyleCached(card.price.displayElement).color)),
    hasShadow: cards.some((card) => normalizeWhitespace(getComputedStyleCached(card.element).boxShadow.toLowerCase()) !== 'none')
  };
}

function classifyScore(score: number): BiasClassification | null {
  if (score >= WEIGHT_THRESHOLDS.strongBiasScore) {
    return 'STRONG_BIAS';
  }

  if (score >= WEIGHT_THRESHOLDS.moderateBiasScore) {
    return 'MODERATE_BIAS';
  }

  if (score >= WEIGHT_THRESHOLDS.weakBiasScore) {
    return 'WEAK_BIAS';
  }

  return null;
}

function buildReason(card: ProductCard, baseline: CheapestBaseline, measurement: CardMeasurement): string {
  const lowestPeerPrice = Math.min(...baseline.cards.map((peer) => peer.price.value));
  return `Higher-priced card (${card.price.value.toFixed(2)}) stands out against comparable nearby products (lowest ${lowestPeerPrice.toFixed(
    2
  )}) with ${measurement.signals.join(', ')}`;
}

function getAtomicContainer(element: HTMLElement): HTMLElement | null {
  const nestedUnits = collectNestedAtomicUnits(element);

  if (nestedUnits.length !== 1) {
    return null;
  }

  return nestedUnits[0];
}

/**
 * Finds groups of visible product cards from container children on the live page.
 */
export function findProductGroups(doc: Document = document): ProductGroup[] {
  if (!(doc.body instanceof HTMLElement)) {
    return [];
  }

  resetProbeCaches();

  const groups = new Map<string, ProductGroup>();
  const containers = collectRelevantContainers(doc);

  for (const container of containers) {
    const candidateRoots = collectCandidateCardRoots(container);

    if (candidateRoots.length < MIN_GROUP_OPTIONS) {
      continue;
    }

    const cards = candidateRoots
      .map((child) => getAtomicContainer(child) ?? child)
      .map((child) => buildProductCard(child))
      .filter((card): card is ProductCard => card !== null);

    const dedupedCards = Array.from(new Map(cards.map((card) => [card.selector, card])).values());

    if (dedupedCards.length < MIN_GROUP_OPTIONS) {
      continue;
    }

    for (const cardChunk of chunkCards(dedupedCards, MAX_GROUP_OPTIONS)) {
      if (cardChunk.length < MIN_GROUP_OPTIONS) {
        continue;
      }

      const key = cardChunk
        .map((card) => card.selector)
        .sort()
        .join('|');

      groups.set(key, {
        container,
        cards: cardChunk,
        priority: getContainerPriority(container)
      });
    }
  }

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      cards: pruneNestedCards(group.cards)
    }))
    .filter((group) => group.cards.length >= MIN_GROUP_OPTIONS)
    .sort((left, right) => {
      if (left.priority !== right.priority) {
        return right.priority - left.priority;
      }

      return getBoundingClientRectCached(left.container).top - getBoundingClientRectCached(right.container).top;
    })
    .slice(0, MAX_GROUPS);
}

/**
 * Flattens grouped product cards into a deduplicated list for page-wide cheapest-price comparison.
 */
export function flattenGroups(groups: ProductGroup[]): ProductCard[] {
  const cards = new Map<string, ProductCard>();

  for (const group of groups) {
    for (const card of group.cards) {
      cards.set(card.selector, card);
    }
  }

  return Array.from(cards.values());
}

/**
 * Measures whether a higher-priced card has stronger visual treatment than the cheapest-card baseline.
 */
export function measureVisualWeight(card: ProductCard, baseline: CheapestBaseline): CardMeasurement {
  const signals: string[] = [];
  let score = 0;
  let hasStrongEmphasis = false;
  let hasStyleEmphasis = false;
  const cardStyle = getComputedStyleCached(card.element);
  const priceStyle = getComputedStyleCached(card.price.displayElement);
  const priceRect = getBoundingClientRectCached(card.price.displayElement);
  const area = card.boundingBox.width * card.boundingBox.height;
  const sizeRatio = area / Math.max(baseline.averageArea, 1);
  const widthRatio = card.boundingBox.width / Math.max(baseline.averageWidth, 1);
  const heightRatio = card.boundingBox.height / Math.max(baseline.averageHeight, 1);
  const priceDisplayAreaRatio = (priceRect.width * priceRect.height) / Math.max(baseline.averagePriceDisplayArea, 1);
  const priceDisplayHeightRatio = priceRect.height / Math.max(baseline.averagePriceDisplayHeight, 1);
  const fontSize = Number.parseFloat(priceStyle.fontSize || '0');
  const fontWeight = parseFontWeight(priceStyle.fontWeight);
  const borderWidth = parseMaxBorderWidth(cardStyle);
  const background = normalizeColor(cardStyle.backgroundColor);
  const priceColor = normalizeColor(priceStyle.color);
  const hasShadow = normalizeWhitespace(cardStyle.boxShadow.toLowerCase()) !== 'none';

  if (sizeRatio > SIZE_RATIO_THRESHOLD.dominant && (widthRatio > 1.12 || (widthRatio > 1.05 && heightRatio > 1.2))) {
    score += 3;
    signals.push('larger card area');
  } else if (sizeRatio > SIZE_RATIO_THRESHOLD.larger && widthRatio > 1.08) {
    score += 1;
    signals.push('slightly larger card area');
  }

  if (fontSize > Math.max(baseline.averagePriceFontSize, 1) * WEIGHT_THRESHOLDS.fontLargerRatio) {
    score += 2;
    hasStrongEmphasis = true;
    hasStyleEmphasis = true;
    signals.push('larger price typography');
  }

  if (
    fontSize <= Math.max(baseline.averagePriceFontSize, 1) * WEIGHT_THRESHOLDS.fontLargerRatio &&
    priceDisplayHeightRatio > 1.35 &&
    priceDisplayAreaRatio > 1.35
  ) {
    score += 1;
    hasStyleEmphasis = true;
    signals.push('larger rendered price block');
  }

  if (fontWeight >= 700 && baseline.averagePriceFontWeight < 700) {
    score += 2;
    hasStyleEmphasis = true;
    signals.push('bolder price typography');
  }

  if (
    borderWidth > WEIGHT_THRESHOLDS.borderHighlightWidthPx &&
    baseline.maxBorderWidth <= WEIGHT_THRESHOLDS.otherBorderMaxWidthPx
  ) {
    score += 2;
    hasStrongEmphasis = true;
    hasStyleEmphasis = true;
    signals.push('thicker card border');
  }

  if (!isTransparentOrWhite(background) && hasMeaningfullyDifferentColor(background, baseline.backgroundColors)) {
    score += 2;
    hasStrongEmphasis = true;
    hasStyleEmphasis = true;
    signals.push('different card background');
  }

  if (!isTransparentOrWhite(priceColor) && hasMeaningfullyDifferentColor(priceColor, baseline.priceColors)) {
    score += 2;
    hasStrongEmphasis = true;
    hasStyleEmphasis = true;
    signals.push('different price color');
  }

  if (hasShadow && !baseline.hasShadow) {
    score += 1;
    signals.push('box-shadow emphasis');
  }

  return {
    card,
    score,
    signals,
    hasStrongEmphasis,
    hasStyleEmphasis
  };
}

function buildGroupPeerMap(groups: ProductGroup[]): Map<string, ProductCard[]> {
  const peerMap = new Map<string, Map<string, ProductCard>>();

  for (const group of groups) {
    for (const card of group.cards) {
      const currentPeers = peerMap.get(card.selector) ?? new Map<string, ProductCard>();

      for (const peer of group.cards) {
        if (peer.selector !== card.selector) {
          currentPeers.set(peer.selector, peer);
        }
      }

      peerMap.set(card.selector, currentPeers);
    }
  }

  return new Map(
    Array.from(peerMap.entries()).map(([selector, peers]) => {
      return [selector, Array.from(peers.values())];
    })
  );
}

function getBaselinePeers(target: ProductCard, allCards: ProductCard[], groupPeerMap: Map<string, ProductCard[]>): ProductCard[] {
  const groupPeers = (groupPeerMap.get(target.selector) ?? [])
    .filter((candidate) => hasSimilarCardSize(target, candidate))
    .sort((left, right) => getPeerPriority(target, right) - getPeerPriority(target, left));
  const lowerPricedGroupPeers = groupPeers.filter((candidate) => candidate.price.value < target.price.value);

  if (lowerPricedGroupPeers.length > 0) {
    return lowerPricedGroupPeers.slice(0, 5);
  }

  if (groupPeers.length > 0) {
    return groupPeers.slice(0, 5);
  }

  const nearbyPeers = allCards
    .filter((candidate) => isComparablePeer(target, candidate))
    .sort((left, right) => getPeerPriority(target, right) - getPeerPriority(target, left))
    .slice(0, 8);
  const lowerPricedNearbyPeers = nearbyPeers.filter((candidate) => candidate.price.value < target.price.value);

  if (lowerPricedNearbyPeers.length > 0) {
    return lowerPricedNearbyPeers.slice(0, 5);
  }

  if (nearbyPeers.length > 0) {
    return nearbyPeers.slice(0, 5);
  }

  return [];
}

/**
 * Finds higher-priced cards that receive stronger visual treatment than lower-priced peers within the same product group.
 */
export function findHigherPricedFindings(groups: ProductGroup[]): CardFinding[] {
  const allCards = pruneNestedCards(flattenGroups(groups));
  const groupPeerMap = buildGroupPeerMap(groups);
  const findings: CardFinding[] = [];
  const globalLowestPrice = Math.min(...allCards.map((card) => card.price.value));

  for (const card of allCards) {
    if (card.price.value <= globalLowestPrice) {
      continue;
    }

    const peerCards = getBaselinePeers(card, allCards, groupPeerMap);
    if (peerCards.length === 0) {
      continue;
    }

    const lowestPeerPrice = Math.min(...peerCards.map((peer) => peer.price.value));

    if (card.price.value <= lowestPeerPrice) {
      continue;
    }

    const baseline = buildVisualBaseline(peerCards);

    if (baseline === null) {
      continue;
    }

    const measurement = measureVisualWeight(card, baseline);
    const classification = classifyScore(measurement.score);

    if (classification === null || measurement.signals.length === 0) {
      continue;
    }

    const priceVisualSignals = measurement.signals.filter((signal) => {
      return (
        signal === 'larger price typography' ||
        signal === 'larger rendered price block' ||
        signal === 'different price color' ||
        signal === 'bolder price typography'
      );
    });
    const hasPriceVisualSignal = priceVisualSignals.length > 0;

    if (!measurement.hasStrongEmphasis && !hasPriceVisualSignal) {
      continue;
    }

    if (!measurement.hasStyleEmphasis && measurement.score < WEIGHT_THRESHOLDS.strongBiasScore) {
      continue;
    }

    if (priceVisualSignals.length === 1 && measurement.score < WEIGHT_THRESHOLDS.moderateBiasScore) {
      continue;
    }

    if (measurement.signals.length < 2 && measurement.score < WEIGHT_THRESHOLDS.moderateBiasScore) {
      if (!hasPriceVisualSignal) {
        continue;
      }
    }

    findings.push({
      classification,
      selector: card.selector,
      visualSelector: card.selector,
      boundingBox: card.boundingBox,
      text: card.text,
      reason: buildReason(card, baseline, measurement)
    });
  }

  return findings;
}
