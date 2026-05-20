export const RULE_ID = 'KO-14';

export const POPUP_CONTAINER_SELECTORS = [
  '[class*="modal"]',
  '[id*="modal"]',
  '[class*="popup"]',
  '[id*="popup"]',
  '[class*="overlay"]',
  '[id*="overlay"]',
  '[role="dialog"]',
  '[class*="lightbox"]',
  '.lightbox',
  '.fancybox',
  '[class*="interstitial"]',
  '[id*="interstitial"]',
  '[aria-modal="true"]',
  '[data-role="dialog"]'
];

export const POPUP_TEXT_SIGNALS = [
  /subscribe\s+to\s+our\s+newsletter/i,
  /sign\s+up\s+for\s+our\s+newsletter/i,
  /get\s+\d+%\s+off/i,
  /unlock\s+\d+%/i,
  /dont\s+miss\s+out/i,
  /before\s+you\s+leave/i,
  /wait\s+before\s+you\s+go/i,
  /join\s+our\s+club/i,
  /spin\s+the\s+wheel/i,
  /looks\s+like\s+you\s+are\s+trying\s+to\s+access/i,
  /shipping\s+to/i,
  /choose\s+your\s+location/i,
  /international\s+websites/i,
  /enter\s+your\s+email/i,
  /newsletter/i
] as const;

export const EXCLUDED_CONTEXT = ['cookie settings', 'privacy policy', 'terms of service'];

export const EXCLUSION_SELECTORS = [
  '[id*="cookie"]',
  '[class*="cookie"]',
  '[id*="privacy"]',
  '[class*="privacy"]',
  '[id*="terms"]',
  '[class*="terms"]',
  '[id*="consent"]',
  '[class*="consent"]',
  '[class*="storeswitcher"]',
  '[id*="storeswitcher"]',
  '[class*="store-switcher"]',
  '[id*="store-switcher"]',
  '[class*="dropdown"]',
  '[class*="nav"]',
  '[class*="navigation"]',
  '[class*="menu"]',
  '[class*="header"]'
];

export const NAVIGATION_KEYWORDS = [
  'storeswitcher',
  'store-switcher',
  'dropdown',
  'nav',
  'navigation',
  'menu',
  'header',
  'cookie',
  'consent',
  'privacy'
] as const;
