export const RULE_ID = 'K-20';
export const MIN_ZINDEX = 100;
export const MAX_CANDIDATES = 30;

export const COVERAGE_THRESHOLDS = {
  large: 0.5,
  dominant: 0.7,
  fullTakeover: 0.9
} as const;

export const OVERLAY_CLASS_PATTERNS = [
  'modal',
  'popup',
  'overlay',
  'interstitial',
  'lightbox',
  'drawer',
  'sheet',
  'takeover',
  'banner-full',
  'consent',
  'cookie',
  'newsletter',
  'promo-popup',
  'exit-intent'
] as const;

export const DISMISS_PATTERNS = {
  ariaLabels: ['close', 'dismiss', 'skip', 'cancel'],
  tokens: ['close', 'dismiss', 'x-btn'],
  buttonTexts: ['×', '✕', 'close', 'skip', 'no thanks']
} as const;
