export const RULE_ID = 'KO-1';

export const DELETION_CONTROL_SELECTOR =
  'button, a, input[type="submit"], input[type="button"], [role="button"], summary, details';
export const HIDDEN_CONTAINER_SELECTOR = '[class*="hidden"], [class*="collapsed"], [aria-hidden="true"]';
export const LOW_CONTRAST_CLASS_PATTERN = /invisible|sr-only|visually-hidden/i;
export const PROFILE_FIELD_PATTERN = /name|username|display name|bio/i;

export const DELETION_GROUPS = {
  A: [
    ['delete', 'account'],
    ['remove', 'account'],
    ['delete', 'profile'],
    ['close', 'account'],
    ['terminate', 'account'],
    ['erase', 'account']
  ],
  B: [
    ['deactivate', 'account'],
    ['disable', 'account'],
    ['suspend', 'account'],
    ['deactivate', 'profile']
  ],
  C: [
    ['right', 'erasure'],
    ['erase', 'data'],
    ['delete', 'data'],
    ['remove', 'data'],
    ['request', 'deletion'],
    ['data', 'deletion']
  ],
  D: ['delete', 'deactivate', 'close-account', 'remove-account', 'erasure']
} as const;

export const PASSWORD_TEXT_SIGNALS = ['change password', 'update password', 'new password'] as const;
export const EMAIL_TEXT_SIGNALS = ['change email', 'update email', 'email address'] as const;
export const NOTIFICATION_TEXT_SIGNALS = [
  'notifications',
  'email preferences',
  'communication settings',
  'marketing emails'
] as const;
