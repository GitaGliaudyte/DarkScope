import { Confidence } from '../../engine/types';

export const RULE_ID = 'KO-5';

export const MAIN_SETTINGS_PATH_SEGMENTS = ['settings', 'account', 'profile', 'preferences', 'my account'] as const;
export const SUBSECTION_KEYWORDS = [
  'orders',
  'billing',
  'payments',
  'security',
  'privacy',
  'notifications',
  'addresses',
  'subscription',
  'history',
  'downloads',
  'returns'
] as const;
export const PRIVACY_KEYWORDS = [
  'privacy',
  'data protection',
  'personal data',
  'cookie',
  'consent',
  'tracking',
  'permissions',
  'sharing',
  'visibility',
  'advertising',
  'ad choices',
  'marketing'
] as const;

export const SETTINGS_NAV_CONTAINER_SELECTOR = 'nav, aside, [role="tablist"], [class*="sidebar"], [class*="settings-nav"]';
export const SETTINGS_NAV_ENTRY_SELECTOR = 'a, [role="tab"], [role="menuitem"]';
export const SETTINGS_NAV_SEARCH_SELECTOR =
  'nav a, aside a, [role="tablist"] [role="tab"], [class*="sidebar"] a, [class*="settings-nav"] a';
export const PRIVACY_NAV_CANDIDATE_SELECTOR =
  'nav a, aside a, [role="tab"], [role="menuitem"], [class*="sidebar"] a, [class*="nav"] a, [class*="menu"] a';
export const MAIN_CONTENT_LINK_SELECTOR = 'main a[href], [role="main"] a[href], article a[href], section a[href]';
export const PRIVACY_HEADING_SELECTOR = 'h2, h3, h4, [role="heading"]';
export const INTERACTIVE_FOLLOWUP_SELECTOR =
  'a[href], button, input, select, textarea, [role="button"], [role="switch"], [role="checkbox"], [role="radio"], [role="link"]';
export const FOOTER_SELECTOR = 'footer, [role="contentinfo"]';
export const STRUCTURAL_CONTAINER_SELECTOR = 'section, article, form, li, div, main';

export const MAIN_NAV_CATEGORY_MIN = 3;
export const LARGE_NAV_CATEGORY_MIN = 4;
export const MAX_EVIDENCE_TEXT_LENGTH = 80;
export const HIGH_SCORE_THRESHOLD = 8;
export const MEDIUM_SCORE_THRESHOLD = 5;
export const LOW_SCORE_THRESHOLD = 1;
export const CONFLICTED_CONFIDENCE_CAP: Confidence = 'medium';
