export const RULE_ID = 'KO-18';

export const LIVE_TEXT_SELECTOR = 'span, div, p, small, strong, b, em, li, label, h1, h2, h3, h4, h5, h6';

export const HIGH_DEMAND_PATTERNS = [
  /high\s+demand/i,
  /selling\s+out\s+quickly/i,
  /selling\s+fast/i,
  /in\s+high\s+demand/i,
  /popular\s+(?:item|product|choice)/i,
  /trending\s+now/i,
  /flying\s+off\s+the\s+shelves/i,
  /back\s+in\s+demand/i,
  /hot\s+(?:item|product|seller)/i,
  /top\s+seller/i,
  /top\s+selling/i,
  /best\s+seller/i,
  /bestseller/i,
  /most\s+popular/i,
  /everyone\s+is\s+buying/i,
  /people\s+are\s+viewing/i,
  /\d+\s+people\s+(?:viewed|bought|interested)/i
] as const;

export const EXCLUDED_SELECTORS = [
  '[role="button"]',
  '[role="listbox"]',
  '[role="option"]',
  '[aria-haspopup="listbox"]',
  '[aria-expanded]',
  '[data-action="a-dropdown-button"]',
  '.a-dropdown-container',
  '.a-dropdown-prompt',
  '.a-dropdown-label',
  '.a-button-inner',
  '.a-button-text',
  '.a-icon-dropdown',
  '.a-button-dropdown',
  '.a-button',
'.a-button-small'
];

export const SORTING_KEYWORDS = [
  /sort\s*by/i,
  /featured/i,
  /price:/i,
  /low\s*to\s*high/i,
  /high\s*to\s*low/i,
  /customer\s*review/i,
  /newest\s*arrivals/i,
  /best\s*sellers/i
];

