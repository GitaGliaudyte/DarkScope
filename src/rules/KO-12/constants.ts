export const RULE_ID = 'KO-12';
export const MIN_PRODUCTS = 4;
export const MIN_STRONG_LISTING_PRODUCTS = 10;
export const MAX_PRODUCTS = 50;
export const MIN_PRODUCT_NAME_WORDS = 3;
export const MAX_CARD_ANCESTOR_DEPTH = 6;
export const MAX_EVIDENCE_PRODUCTS = 3;
export const STRUCTURAL_CLUSTER_CONTAINER_SELECTOR = 'main, section, div, ul, ol, article';

export const PRODUCT_CARD_SELECTORS = {
  candidateRoots: 'li, article, div',
  hintedRoots: [
    '[class*="product-card"]',
    '[id*="product-card"]',
    '[class*="product-item"]',
    '[id*="product-item"]',
    '[class*="product-tile"]',
    '[id*="product-tile"]',
    '[class*="item-card"]',
    '[id*="item-card"]',
    '[class*="listing-item"]',
    '[id*="listing-item"]',
    '[class*="search-result-item"]',
    '[id*="search-result-item"]',
    '[class*="grid-item"]',
    '[id*="grid-item"]',
    '[class*="catalog-item"]',
    '[id*="catalog-item"]'
  ].join(', '),
  image: 'img, [role="img"]',
  price: '[class*="price"], [id*="price"], [data-price], span, div, p, strong, b',
  text: 'a, h1, h2, h3, h4, span, p, div',
  excludedAncestors: 'nav, header, footer'
} as const;

export const SORT_PATTERNS = {
  attributes: [/\b(?:sort(?:\s*by)?|order(?:\s*by)?|orderby|sortby)\b/i] as const,
  labels: [/\b(?:sort(?:\s*by)?|order(?:\s*by)?)\b/i] as const,
  options: [
    /\b(?:best\s+match|featured|lowest\s+price|highest\s+price|price\s*:?\s*(?:low|high)|newest|newly\s+listed|ending\s+soonest|rating|relevance)\b/i
  ] as const,
  buttons: [/\b(?:sort(?:\s*by)?|order\s*by|price\s+(?:asc|desc))\b/i] as const,
  ordering: [
    /\b(?:best\s+match|featured|price|low(?:est)?\s+to\s+high|high(?:est)?\s+to\s+low|lowest\s+price|highest\s+price|rating|date|newest|newly\s+listed|ending\s+soonest|oldest|relevance)\b/i
  ] as const
} as const;

export const FILTER_PATTERNS = {
  containers: [/\b(?:all\s+filters?|show\s+filters?|filters?|facets?|refin(?:e|ement)|narrow(?:\s+results)?|sidebar\s+filters?|layered\s+nav)\b/i] as const,
  buttons: [/\b(?:all\s+filters?|show\s+filters?|filters?|show\s+only|refine|narrow(?:\s+results)?)\b/i] as const,
  labels: [/\b(?:all\s+filters?|filters?|facets?|refine)\b/i] as const,
  priceTerms: [/\b(?:price|from|to|min|max|under|over)\b/i] as const,
  facetDescriptors: [/\b(?:brand|size|color|colour|condition|price|rating|material|availability|seller|location|discount)\b/i] as const
} as const;

export const PRICE_RANGE_PATTERNS = {
  rangeInputSelector: 'input[type="range"]',
  numericInputSelector: 'input[type="number"], input[inputmode="numeric"], input[inputmode="decimal"]'
} as const;

export const PAGINATION_PATTERNS = {
  containers: [/\b(?:pagination|pager)\b/i] as const,
  next: [/\b(?:next|next\s+page)\b/i] as const
} as const;
