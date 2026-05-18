export const RULE_ID = 'KO-16';

export const CHECKBOX_SELECTORS = [
  'input[type="checkbox"]',
  'input[type="checkbox"][checked]',
  '[role="checkbox"][aria-checked="true"]',
  '.checkbox',
  '[class*="checkbox"]',
  '[id*="checkbox"]'
];

export const NEWSLETTER_MARKETING_PATTERNS = [
  /newsletter/i,
  /marketing/i,
  /promotional/i,
  /offers/i,
  /deals/i,
  /discounts/i,
  /updates/i,
  /news/i,
  /email.*preferences/i,
  /subscribe/i,
  /promotions/i,
  /advertisements/i,
  /special.*offers/i,
  /product.*updates/i,
  /brand.*communications/i
];

export const EXCLUSION_PATTERNS = [
  /terms.*conditions/i,
  /privacy.*policy/i,
  /account.*creation/i,
  /user.*agreement/i,
  /required/i,
  /mandatory/i,
  /agree.*terms/i,
  /accept.*policy/i
];

export const EXCLUSION_SELECTORS = [
  '[class*="terms"]',
  '[class*="privacy"]',
  '[class*="agreement"]',
  '[class*="required"]',
  '[class*="mandatory"]'
];
