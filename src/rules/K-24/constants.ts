export const RULE_ID = 'K-24';
export const MAX_INPUTS = 50;
export const PROXIMITY_THRESHOLD_PX = 500;

export const CHECKED_INPUT_SELECTOR = 'input[type="checkbox"]:checked, input[type="radio"]:checked, option[selected]';
export const CUSTOM_ROLE_SELECTOR = '[role="checkbox"][aria-checked="true"], [role="radio"][aria-checked="true"]';
export const CUSTOM_TOGGLE_SELECTOR =
  '[class*="checkbox"], [id*="checkbox"], [class*="toggle"], [id*="toggle"], [class*="switch"], [id*="switch"]';
export const EXCLUDED_CONTAINER_SELECTOR = 'nav, header';
export const PRIORITY_CONTAINER_SELECTOR =
  'form, main, [role="main"], [class*="checkout"], [id*="checkout"], [class*="cart"], [id*="cart"], [class*="registration"], [id*="registration"]';
export const DECISION_BUTTON_SELECTOR =
  'button, input[type="submit"], input[type="button"], input[type="image"], a[role="button"], [role="button"]';
export const FORM_SUBMIT_SELECTOR = 'button[type="submit"], button:not([type]), input[type="submit"], input[type="image"]';

export const HIDDEN_TRUE_VALUES = ['1', 'true', 'on'] as const;
export const CUSTOM_CHECKED_STATE_REGEXES = [
  /\b(?:aria[-_\s]?checked|checked|selected|active|on|enabled)\b/i,
  /\bcheckbox[-_\s]?(?:select|selected|checked|on)\b/i,
  /\bicon[-_\s]?(?:checkbox|check).{0,16}\b(?:select|selected|checked|on)\b/i
] as const;

export const SUSPICIOUS_LABEL_REGEXES = {
  paidAddOns: [/\binsur(?:ance|ed)?\b/i, /\bprotect(?:ion|ed)?\b/i, /\bwarrant(?:y|ies)\b/i, /\bguarantee(?:d)?\b/i, /\bcover(?:age)?\b/i],
  marketing: [/\bnews\s*letter\b/i, /\bmarket(?:ing)?\b/i, /\boffers?\b/i, /\bdeals?\b/i, /\bpromot(?:ion|ions|ional|ions)?\b/i, /\bupdates?\b/i],
  subscriptions: [/\bsubscri(?:be|ption|ber|bing)\b/i, /\brecurr(?:ing|ence)?\b/i, /\bauto(?:matic(?:ally)?)?[-\s]?renew(?:al)?\b/i],
  donations: [/\bdonat(?:e|ion|ions|ing)\b/i, /\bround[-\s]?up\b/i, /\bcharit(?:y|able)\b/i],
  dataSharing: [/\bpartners?\b/i, /\bthird[-\s]?party\b/i, /\bshar(?:e|ing)\b/i],
  legalConsent: [
    /\b(?:accept|agree|consent)\b.{0,80}\b(?:terms?|conditions?|privacy|policy|policies|cookie|cookies)\b/i,
    /\bterms?\s*(?:&|and)\s*conditions?\b/i,
    /\bprivacy\s+policy\b/i
  ],
  persistentLogin: [
    /\b(?:keep|stay)\b.{0,24}\b(?:signed|logged)\s+in\b/i,
    /\bremember\b.{0,40}\b(?:me|device|account|bank(?:\s+account)?|card|payment|details?|info|login|session)\b/i,
    /\btrust\b.{0,24}\bdevice\b/i,
    /\bkmsi\b/i
  ]
} as const;

export const SUSPICIOUS_NAME_REGEXES = [/\bmarket(?:ing)?\b/i, /\bnews\s*letter\b/i, /\bconsent\b/i, /\bsubscri(?:be|ption)\b/i, /\bopt[-_\s]?in\b/i] as const;
export const PERSISTENT_LOGIN_NAME_REGEXES = [
  /\bremember(?:me)?\b/i,
  /\bkmsi\b/i,
  /\b(?:keep|stay)[-_\s]?(?:me[-_\s]?)?(?:signed|logged)?[-_\s]?in\b/i,
  /\bremember\b.{0,24}\b(?:bank|account|card|payment|device|login)\b/i
] as const;

export const NEUTRAL_INPUT_PATTERNS = {
  requiredLegend: ['required']
} as const;

export const DECISION_CTA_TERMS = [
  'buy',
  'purchase',
  'checkout',
  'pay',
  'order',
  'subscribe'
] as const;
