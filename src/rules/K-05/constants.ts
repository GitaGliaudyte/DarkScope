export const RULE_ID = 'K-05';
export const MAX_CANDIDATES = 20;
export const MIN_TEXT_LENGTH = 50;

export const TIER_1_SELECTOR = [
  '[class*="spec"]',
  '[id*="spec"]',
  '[class*="description"]',
  '[id*="description"]',
  '[class*="detail"]',
  '[id*="detail"]',
  '[class*="privacy"]',
  '[class*="terms"]',
  '[class*="policy"]',
  '[class*="legal"]',
  '[class*="price"]',
  '[class*="pricing"]',
  '[class*="cost"]'
].join(', ');

export const TIER_2_SELECTOR = ['p', 'span', 'article', 'section', 'main', '[role="main"]'].join(', ');
export const DIRECT_BLOCKING_SELECTOR = [
  '[oncopy]',
  '[onselectstart]',
  '[style*="user-select"]',
  '[style*="-webkit-user-select"]'
].join(', ');
export const NAVIGATION_SELECTOR = ['nav', 'header', '[role="navigation"]', '[class*="breadcrumb"]', '[class*="menu"]'].join(
  ', '
);
export const SUPPLEMENTAL_ZONE_SELECTOR =
  'aside, footer, [class*=recommend], [class*=related], [class*=suggest], [class*=sidebar], [class*=upsell], [class*=widget]';
export const INLINE_FALSE_HANDLER_PATTERN = /^\s*return\s+false\s*;?\s*$/i;
export const INLINE_USER_SELECT_NONE_PATTERN = /(?:^|;)\s*(?:-webkit-)?user-select\s*:\s*none\b/i;

export const HIGH_IMPACT_SELECTOR = [
  '[class*="privacy"]',
  '[id*="privacy"]',
  '[class*="terms"]',
  '[id*="terms"]',
  '[class*="policy"]',
  '[id*="policy"]',
  '[class*="legal"]',
  '[id*="legal"]'
].join(', ');

export const MEDIUM_IMPACT_SELECTOR = [
  '[class*="spec"]',
  '[id*="spec"]',
  '[class*="price"]',
  '[id*="price"]',
  '[class*="pricing"]',
  '[id*="pricing"]',
  '[class*="description"]',
  '[id*="description"]'
].join(', ');
