export const RULE_ID = 'KO-9';

export const MAX_GROUPS = 10;
export const MAX_GROUP_OPTIONS = 12;
export const MIN_GROUP_OPTIONS = 2;
export const MAX_DESCENDANT_SCAN = 40;
export const MAX_GROUP_DESCENDANT_SCAN = 120;
export const MAX_CONTAINER_CANDIDATES = 120;
export const MAX_CANDIDATE_ROOTS_PER_CONTAINER = 48;
export const MAX_PRICE_TEXT_LENGTH = 160;
export const MAX_EVIDENCE_TEXT_LENGTH = 220;
export const MAX_CARD_ANCESTOR_DEPTH = 5;
export const MAX_INLINE_PRICE_CONTEXT_LENGTH = 8;

export const EXCLUDED_CONTAINER_SELECTOR = 'nav, header';
export const FILTER_CONTAINER_SELECTOR =
  '[class*="filter"], [id*="filter"], [class*="facet"], [id*="facet"], [class*="sort"], [id*="sort"], [class*="refine"], [id*="refine"], [class*="narrow"], [id*="narrow"], [aria-label*="filter"], [aria-label*="sort"]';
export const DEPRIORITIZED_CONTAINER_SELECTOR =
  'aside, footer, [class*="sidebar"], [class*="recommend"], [class*="related"], [class*="upsell"], [class*="widget"]';
export const PRIORITY_ROOT_SELECTOR = 'main, [role="main"], [class*="results"], [class*="products"], [class*="listing"]';

export const PRODUCT_CARD_HINT_SELECTORS = [
  '[class*="product"]',
  '[id*="product"]',
  '[class*="result"]',
  '[id*="result"]',
  '[class*="item"]',
  '[id*="item"]',
  '[class*="listing"]',
  '[id*="listing"]',
  '[class*="card"]',
  '[id*="card"]'
] as const;

export const PRICE_DISPLAY_SELECTORS = ['[class*="price"]', '[id*="price"]', '[data-price]'] as const;

export const SIZE_RATIO_THRESHOLD = {
  dominant: 1.3,
  larger: 1.15
} as const;

export const WEIGHT_THRESHOLDS = {
  fontLargerRatio: 1.1,
  priceDisplayLargerRatio: 1.2,
  borderHighlightWidthPx: 2,
  otherBorderMaxWidthPx: 1,
  weakBiasScore: 2,
  moderateBiasScore: 4,
  strongBiasScore: 6
} as const;
