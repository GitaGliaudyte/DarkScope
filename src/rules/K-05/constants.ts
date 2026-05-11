export const RULE_ID = 'K-05';
export const MAX_PROBE_COUNT = 30;
export const CANDIDATE_SELECTOR = [
  'input[type="text"]',
  'input[type="password"]',
  'input[type="email"]',
  'input[type="number"]',
  'input[type="tel"]',
  'input[type="search"]',
  'input:not([type])',
  'textarea',
  '[contenteditable="true"]'
].join(', ');
export const SUPPLEMENTAL_ZONE_SELECTOR =
  'aside, footer, [class*=recommend], [class*=related], [class*=suggest], [class*=sidebar], [class*=upsell], [class*=widget]';
export const PAYMENT_FIELD_PATTERN = /card|cvv|cvc|expir|pan|credit|debit|payment|cc-/i;
export const EMAIL_OR_USERNAME_PATTERN = /email|user(name)?|login/i;
export const INLINE_FALSE_HANDLER_PATTERN = /^\s*return\s+false\s*;?\s*$/i;
