import { generateUniqueSelector, isVisibleElement } from '../../engine/normalizedElements';
import { extractPriceTokens, parsePrice } from '../KO-7/parsing';
import {
  MAX_CARD_ANCESTOR_DEPTH,
  MAX_PRODUCTS,
  MIN_PRODUCTS,
  MIN_PRODUCT_NAME_WORDS,
  MIN_STRONG_LISTING_PRODUCTS,
  PRODUCT_CARD_SELECTORS,
  STRUCTURAL_CLUSTER_CONTAINER_SELECTOR
} from './constants';
import { getElementText, includesAny, normalizeToken } from './domUtils';
import { ProductCard, ProductCountResult } from './types';

function isExcludedProductZone(element: Element): boolean {
  return element.closest(PRODUCT_CARD_SELECTORS.excludedAncestors) !== null;
}

function getWordCount(text: string): number {
  return text
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0).length;
}

function hasPriceToken(text: string): boolean {
  return extractPriceTokens(text).some((token) => parsePrice(token) !== null);
}

function findProductNameText(element: HTMLElement): string {
  const candidates = [element, ...Array.from(element.querySelectorAll<HTMLElement>(PRODUCT_CARD_SELECTORS.text))];
  let bestCandidate = '';
  let bestScore = Number.POSITIVE_INFINITY;

  for (const candidate of candidates) {
    const text = getElementText(candidate);

    if (text.length === 0 || hasPriceToken(text)) {
      continue;
    }

    const wordCount = getWordCount(text);

    if (wordCount < MIN_PRODUCT_NAME_WORDS) {
      continue;
    }

    if (!/[a-zA-Z\u00C0-\u024F]/.test(text)) {
      continue;
    }

    const score = wordCount * 10 + text.length;

    if (score < bestScore) {
      bestCandidate = text;
      bestScore = score;
    }
  }

  return bestCandidate;
}

function hasImageSignal(element: HTMLElement): boolean {
  if (element.matches(PRODUCT_CARD_SELECTORS.image)) {
    return true;
  }

  return element.querySelector(PRODUCT_CARD_SELECTORS.image) !== null;
}

function findDuplicateIndex(element: HTMLElement, products: ProductCard[]): number {
  return products.findIndex((product) => product.element === element || product.element.contains(element) || element.contains(product.element));
}

function buildProductCard(element: HTMLElement): ProductCard | null {
  if (
    isExcludedProductZone(element) ||
    !isVisibleElement(element) ||
    !element.matches(PRODUCT_CARD_SELECTORS.candidateRoots) ||
    !hasImageSignal(element)
  ) {
    return null;
  }

  const nameText = findProductNameText(element);

  if (nameText.length === 0) {
    return null;
  }

  const hasPrice = hasPriceToken(getElementText(element));

  if (!hasPrice) {
    return null;
  }

  const boundingBox = element.getBoundingClientRect();

  if (boundingBox.width <= 0 || boundingBox.height <= 0) {
    return null;
  }

  return {
    element,
    selector: generateUniqueSelector(element),
    text: nameText,
    boundingBox
  };
}

function addProductCard(products: ProductCard[], card: ProductCard, hasMoreThanLimit: { value: boolean }): boolean {
  const duplicateIndex = findDuplicateIndex(card.element, products);

  if (duplicateIndex >= 0) {
    const duplicate = products[duplicateIndex];

    if (duplicate.element.contains(card.element)) {
      products.splice(duplicateIndex, 1, card);
    }

    return false;
  }

  if (products.length >= MAX_PRODUCTS) {
    hasMoreThanLimit.value = true;
    return true;
  }

  products.push(card);
  return false;
}

function copyProducts(source: ProductCard[]): ProductCard[] {
  return source.map((product) => ({
    ...product
  }));
}

function getPreferredProductSet(candidates: ProductCard[][]): ProductCard[] {
  return candidates.reduce<ProductCard[]>((best, current) => {
    if (current.length > best.length) {
      return current;
    }

    return best;
  }, []);
}

function collectHintedProductCards(doc: Document, products: ProductCard[], hasMoreThanLimit: { value: boolean }): boolean {
  for (const candidate of Array.from(doc.querySelectorAll<HTMLElement>(PRODUCT_CARD_SELECTORS.hintedRoots))) {
    const card = buildProductCard(candidate);

    if (card === null) {
      continue;
    }

    if (addProductCard(products, card, hasMoreThanLimit)) {
      return true;
    }
  }

  return false;
}

function collectStructuralClusterProductCards(doc: Document, products: ProductCard[], hasMoreThanLimit: { value: boolean }): void {
  let bestCluster: ProductCard[] = [];

  for (const container of Array.from(doc.querySelectorAll<HTMLElement>(STRUCTURAL_CLUSTER_CONTAINER_SELECTOR))) {
    if (isExcludedProductZone(container)) {
      continue;
    }

    const childCandidates = Array.from(container.children).filter(
      (child): child is HTMLElement => child instanceof HTMLElement && child.matches(PRODUCT_CARD_SELECTORS.candidateRoots)
    );

    if (childCandidates.length < MIN_PRODUCTS) {
      continue;
    }

    const cluster: ProductCard[] = [];
    const clusterOverflow = { value: false };

    for (const child of childCandidates) {
      const card = buildProductCard(child);

      if (card === null) {
        continue;
      }

      if (addProductCard(cluster, card, clusterOverflow)) {
        break;
      }
    }

    if (cluster.length >= MIN_PRODUCTS && cluster.length > bestCluster.length) {
      bestCluster = cluster;

      if (bestCluster.length >= MAX_PRODUCTS) {
        hasMoreThanLimit.value = clusterOverflow.value;
        break;
      }
    }
  }

  for (const card of bestCluster) {
    if (addProductCard(products, card, hasMoreThanLimit)) {
      return;
    }
  }
}

function collectImageAnchoredProductCards(doc: Document, products: ProductCard[], hasMoreThanLimit: { value: boolean }): void {
  const images = Array.from(doc.querySelectorAll(PRODUCT_CARD_SELECTORS.image));

  for (const image of images) {
    let current = image.parentElement;
    let depth = 0;

    while (current !== null && depth < MAX_CARD_ANCESTOR_DEPTH) {
      if (current.matches(PRODUCT_CARD_SELECTORS.candidateRoots)) {
        const card = buildProductCard(current);

        if (card !== null && addProductCard(products, card, hasMoreThanLimit)) {
          return;
        }

        if (card !== null) {
          break;
        }
      }

      current = current.parentElement;
      depth += 1;
    }

    if (hasMoreThanLimit.value) {
      return;
    }
  }
}

function isLikelyProductDetailPage(doc: Document, productCount: ProductCountResult): boolean {
  const title = doc.querySelector('h1');

  if (!(title instanceof HTMLElement) || getWordCount(getElementText(title)) < MIN_PRODUCT_NAME_WORDS) {
    return false;
  }

  const detailCtaTerms = ['add to cart', 'buy now', 'purchase', 'add to bag', 'add to basket'];
  const ctaSelector =
    'button, a[role="button"], a, input[type="submit"], input[type="button"], input[type="image"], [role="button"]';
  const controls = Array.from(doc.querySelectorAll<HTMLElement>(ctaSelector));

  for (const control of controls) {
    const controlText = normalizeToken(getElementText(control));

    if (!includesAny(controlText, detailCtaTerms)) {
      continue;
    }

    let current: HTMLElement | null = title;
    let depth = 0;

    while (current !== null && depth < MAX_CARD_ANCESTOR_DEPTH) {
      const container: HTMLElement = current;
      const containerText = getElementText(container);

      if (
        container.contains(control) &&
        container.querySelector(PRODUCT_CARD_SELECTORS.image) !== null &&
        hasPriceToken(containerText) &&
        productCount.products.filter((product) => container.contains(product.element)).length < MIN_PRODUCTS
      ) {
        return true;
      }

      current = container.parentElement;
      depth += 1;
    }
  }

  return false;
}

function findPrimaryProductDetailHero(doc: Document): HTMLElement | null {
  const title = doc.querySelector('h1');

  if (!(title instanceof HTMLElement) || getWordCount(getElementText(title)) < MIN_PRODUCT_NAME_WORDS) {
    return null;
  }

  const detailCtaTerms = ['add to cart', 'buy now', 'purchase', 'add to bag', 'add to basket'];
  const ctaSelector =
    'button, a[role="button"], a, input[type="submit"], input[type="button"], input[type="image"], [role="button"]';
  const controls = Array.from(doc.querySelectorAll<HTMLElement>(ctaSelector));
  let current: HTMLElement | null = title;
  let depth = 0;

  while (current !== null && depth < MAX_CARD_ANCESTOR_DEPTH + 2) {
    const container: HTMLElement = current;
    const containerText = getElementText(container);
    const hasHeroImage = container.querySelector(PRODUCT_CARD_SELECTORS.image) !== null;
    const hasHeroPrice = hasPriceToken(containerText);
    const hasHeroCta = controls.some((control) => {
      return container.contains(control) && includesAny(normalizeToken(getElementText(control)), detailCtaTerms);
    });

    if (hasHeroImage && hasHeroPrice && hasHeroCta) {
      return container;
    }

    current = current.parentElement;
    depth += 1;
  }

  return null;
}

function isSupplementalListingContainer(element: HTMLElement): boolean {
  return (
    element.closest(
      'aside, footer, [class*="recommend"], [class*="related"], [class*="suggest"], [class*="similar"], [class*="upsell"], [class*="cross-sell"], [class*="widget"], [aria-label*="recommended"], [aria-label*="related"]'
    ) !== null
  );
}

function getListingCardsTop(products: ProductCard[]): number | null {
  if (products.length === 0) {
    return null;
  }

  let top = Number.POSITIVE_INFINITY;

  for (const product of products) {
    const rect = product.element.getBoundingClientRect();

    if (rect.width <= 0 || rect.height <= 0) {
      continue;
    }

    top = Math.min(top, rect.top);
  }

  return Number.isFinite(top) ? top : null;
}

function getSupplementalProductCount(products: ProductCard[]): number {
  return products.filter((product) => isSupplementalListingContainer(product.element)).length;
}

function getCountLabel(count: number, hasMoreThanLimit: boolean): string {
  return hasMoreThanLimit ? `${MAX_PRODUCTS}+` : `${count}`;
}

function getCommonAncestor(elements: HTMLElement[]): HTMLElement | null {
  if (elements.length === 0) {
    return null;
  }

  const ancestorChains = elements.map((element) => {
    const chain: HTMLElement[] = [];
    let current: HTMLElement | null = element;

    while (current !== null) {
      chain.push(current);
      current = current.parentElement;
    }

    return chain;
  });

  const [firstChain, ...restChains] = ancestorChains;

  for (const candidate of firstChain) {
    if (candidate === document.body || candidate === document.documentElement) {
      continue;
    }

    if (restChains.every((chain) => chain.includes(candidate))) {
      return candidate;
    }
  }

  return elements[0] ?? null;
}

export function getListingAnchor(products: ProductCard[]): HTMLElement | null {
  const elements = products.slice(0, MIN_PRODUCTS).map((product) => product.element);
  return getCommonAncestor(elements) ?? products[0]?.element ?? null;
}

export function countProducts(doc: Document = document): ProductCountResult {
  if (!(doc.body instanceof HTMLElement)) {
    return {
      count: 0,
      countLabel: '0',
      products: [],
      hasMoreThanLimit: false
    };
  }

  const hintedProducts: ProductCard[] = [];
  const hintedOverflow = { value: false };
  collectHintedProductCards(doc, hintedProducts, hintedOverflow);

  const structuralProducts: ProductCard[] = [];
  const structuralOverflow = { value: false };
  collectStructuralClusterProductCards(doc, structuralProducts, structuralOverflow);

  const anchoredProducts: ProductCard[] = [];
  const anchoredOverflow = { value: false };

  if (hintedProducts.length < MIN_PRODUCTS && structuralProducts.length < MIN_PRODUCTS) {
    collectImageAnchoredProductCards(doc, anchoredProducts, anchoredOverflow);
  }

  const products = copyProducts(getPreferredProductSet([hintedProducts, structuralProducts, anchoredProducts]));
  const hasMoreThanLimit =
    hintedProducts.length === products.length
      ? hintedOverflow
      : structuralProducts.length === products.length
        ? structuralOverflow
        : anchoredOverflow;

  return {
    count: products.length,
    countLabel: getCountLabel(products.length, hasMoreThanLimit.value),
    products,
    hasMoreThanLimit: hasMoreThanLimit.value
  };
}

export function isProductListingPage(doc: Document = document): boolean {
  const productCount = countProducts(doc);
  return productCount.count >= MIN_PRODUCTS && !shouldTreatAsProductDetailPage(doc, productCount);
}

export function shouldTreatAsProductDetailPage(doc: Document, productCount: ProductCountResult): boolean {
  const detailHero = findPrimaryProductDetailHero(doc);
  const hasDetailHero = detailHero !== null || isLikelyProductDetailPage(doc, productCount);

  if (!hasDetailHero) {
    return false;
  }

  if (detailHero !== null) {
    return true;
  }

  if (productCount.count < MIN_STRONG_LISTING_PRODUCTS) {
    return true;
  }

  const listingAnchor = getListingAnchor(productCount.products);
  const title = doc.querySelector('h1');
  const supplementalProductCount = getSupplementalProductCount(productCount.products);

  if (!(listingAnchor instanceof HTMLElement) || !(title instanceof HTMLElement)) {
    return true;
  }

  if (supplementalProductCount >= Math.min(productCount.count, MIN_PRODUCTS)) {
    return true;
  }

  if (isSupplementalListingContainer(listingAnchor)) {
    return true;
  }

  const titleRect = title.getBoundingClientRect();
  const listingRect = listingAnchor.getBoundingClientRect();
  const listingCardsTop = getListingCardsTop(productCount.products);

  if (listingCardsTop !== null) {
    return productCount.count < MIN_STRONG_LISTING_PRODUCTS * 2 && listingCardsTop > titleRect.bottom + 160;
  }

  return productCount.count < MIN_STRONG_LISTING_PRODUCTS * 2 && listingRect.top > titleRect.bottom + 160;
}
