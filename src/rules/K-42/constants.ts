export const RULE_ID = 'K-42';

export const SIGNUP_FORM_SELECTORS = [
  'form[action*="signup"]',
  'form[action*="register"]',
  'form[id*="signup"]',
  'form[id*="register"]',
  'form[class*="signup"]',
  'form[class*="register"]',

  'form[action*="create"]',
  'form[id*="create"]',
  'form[class*="create"]',
  'form[action*="account"]',
  'form[id*="account"]',
  'form[class*="account"]',

  'form:has(input[type="password"])'
];

export const EMAIL_FIELD_PATTERNS = [
  /email/i,
  /e-mail/i,
  /mail/i
];

export const PASSWORD_FIELD_PATTERNS = [
  /password/i,
  /pass/i
];

export const EXTRA_SENSITIVE_FIELD_PATTERNS = [
  /phone/i,
  /mobile/i,
  /cell/i,
  /tel/i,
  /address/i,
  /street/i,
  /city/i,
  /zip/i,
  /postal/i,
  /country/i,
  /birth/i,
  /birthday/i,
  /dob/i,
  /social security/i,
  /ssn/i,
  /id number/i,
  /passport/i,
  /tax/i,
  /company/i,
  /organization/i,
  /job/i,
  /occupation/i,
  /gender/i,
  /state/i,
  /first/i,
  /last/i,
  /name/i,
  /given-name/i,
  /family-name/i
];

