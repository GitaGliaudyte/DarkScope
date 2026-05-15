export const RULE_ID = 'K-16';
export const MAX_PRICE_GROUPS = 20;
export const DISCOUNT_THRESHOLD = 70;
export const MAX_PRICE_VALUE = 100000;
export const MAX_PROXIMITY_PX = 300;
export const MAX_COMMON_ANCESTOR_DEPTH = 3;
export const MAX_EVIDENCE_TEXT_LENGTH = 180;
export const MAX_CANDIDATE_TEXT_LENGTH = 80;
export const MAX_CANDIDATE_DESCENDANTS = 12;
export const MAX_CANDIDATE_WIDTH_RATIO = 0.75;
export const MAX_CANDIDATE_HEIGHT_RATIO = 0.3;
export const MAX_GROUP_TARGET_TEXT_LENGTH = 220;
export const MAX_GROUP_TARGET_DESCENDANTS = 40;
export const MAX_GROUP_TARGET_WIDTH_RATIO = 0.8;
export const MAX_GROUP_TARGET_HEIGHT_RATIO = 0.45;
export const MAX_SHIPPING_CONTEXT_TEXT_LENGTH = 80;
export const MAX_SHIPPING_CONTEXT_DEPTH = 2;
export const MAX_RANGE_CONTEXT_DEPTH = 3;
export const MAX_RANGE_CONTEXT_TEXT_LENGTH = 220;

export const ORIGINAL_PRICE_SELECTORS = [
  's',
  'del',
  'strike',
  '[data-a-strike]',
  '[data-strike]',
  '[data-original-price]',
  '[data-old-price]',
  '[data-list-price]',
  '[data-compare-price]',
  '[class*="original"]',
  '[id*="original"]',
  '[class*="was"]',
  '[id*="was"]',
  '[class*="old-price"]',
  '[id*="old-price"]',
  '[class*="before"]',
  '[id*="before"]',
  '[class*="regular"]',
  '[id*="regular"]',
  '[class*="list-price"]',
  '[id*="list-price"]',
  '[class*="rrp"]',
  '[id*="rrp"]',
  '[class*="msrp"]',
  '[id*="msrp"]',
  '[class*="compare"]',
  '[id*="compare"]',
  '[class*="strike"]',
  '[id*="strike"]',
  '[aria-label*="original price"]',
  '[aria-label*="was"]',
  '[aria-label*="before"]'
] as const;

export const FINAL_PRICE_SELECTORS = [
  '[class*="price"]',
  '[id*="price"]',
  '[class*="now"]',
  '[id*="now"]',
  '[class*="current"]',
  '[id*="current"]',
  '[class*="sale"]',
  '[id*="sale"]',
  '[class*="offer"]',
  '[id*="offer"]',
  '[class*="discounted"]',
  '[id*="discounted"]',
  '[class*="checkout-price"]',
  '[id*="checkout-price"]',
  '[class*="final"]',
  '[id*="final"]'
] as const;

export const DISCOUNT_LABEL_PATTERNS = {
  percentage: [
    /(?:^|[^\d])-(\d{1,3}(?:[.,]\d+)?)\s*%/i,
    /\b(\d{1,3}(?:[.,]\d+)?)\s*%\s*(?:off|discount|nuolaida|rabatt)\b/i,
    /\b(?:save|you save|taupote|sutaup(?:yk|ote))\s*(\d{1,3}(?:[.,]\d+)?)\s*%\b/i
  ],
  absolute: [
    /\b(?:save|you save|taupote|sutaup(?:yk|ote))\s*((?:[€$£¥]|kr|zł)\s*-?\d[\d\s.,]*|\d[\d\s.,]*\s*(?:€|\$|£|¥|kr|zł))\b/i
  ]
} as const;

export const CURRENCY_SYMBOLS = ['€', '$', '£', '¥', 'kr', 'zł'] as const;

export const PRIORITY_ROOT_SELECTOR =
  'main, [role="main"], [class*="product"], [class*="price"], [class*="checkout"]';
export const EXCLUDED_CONTAINER_SELECTOR = 'nav, header';
export const SUPPLEMENTAL_CONTAINER_SELECTOR =
  'aside, footer, [class*="sidebar"], [class*="recommend"], [class*="related"]';
export const SHIPPING_PRICE_SELECTORS = [
  '[class*="shipping"]',
  '[id*="shipping"]',
  '[class*="delivery"]',
  '[id*="delivery"]',
  '[class*="postage"]',
  '[id*="postage"]',
  '[class*="freight"]',
  '[id*="freight"]',
  '[class*="handling"]',
  '[id*="handling"]',
  '[aria-label*="shipping"]',
  '[aria-label*="delivery"]',
  '[title*="shipping"]',
  '[title*="delivery"]'
] as const;

export const SHIPPING_KEYWORDS = ['shipping', 'delivery', 'postage', 'freight', 'handling'] as const;

export const ORIGINAL_PRICE_KEYWORDS = [
  'original',
  'was',
  'old-price',
  'before',
  'regular',
  'list-price',
  'rrp',
  'msrp',
  'compare',
  'strike'
] as const;

export const FINAL_PRICE_KEYWORDS = [
  'price',
  'now',
  'current',
  'sale',
  'offer',
  'discounted',
  'checkout-price',
  'final'
] as const;
