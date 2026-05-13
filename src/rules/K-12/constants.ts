export const RULE_ID = 'K-12';

export const MAX_ELEMENTS = 60;
export const MAX_EVIDENCE = 5;
export const MAX_TEXT_LENGTH = 120;

export const AD_DISCLOSURE_ATTRS = [
  'data-ad',
  'data-ad-unit',
  'data-ad-slot',
  'data-dfp',
  'data-google-query-id'
] as const;

export const DATA_DISCLOSURE_PATTERNS = ['ad', 'sponsor', 'promo', 'affiliate'] as const;
export const DISCLOSURE_ARIA_PATTERNS = ['ad', 'advertisement', 'sponsor', 'promoted', 'affiliate'] as const;
export const DISCLOSURE_TEXT_LABELS = ['advertisement', 'sponsored', 'promoted'] as const;
export const DISCLOSURE_CLASS_PATTERNS = [
  'ad-',
  '-ad',
  'ads',
  'advert',
  'sponsor',
  'promoted',
  'affiliate',
  'native-ad',
  'dfp',
  'adsense',
  'taboola',
  'outbrain',
  'revcontent',
  'mgid'
] as const;

export const CONTENT_CLASS_PATTERNS = [
  'card',
  'post',
  'article',
  'story',
  'item',
  'tile',
  'block',
  'widget',
  'recommended',
  'related',
  'read-more',
  'more-stories'
] as const;

export const CTA_PATTERNS = ['read more', 'learn more', 'discover', 'find out'] as const;
export const BUTTON_CLASS_PATTERNS = ['button', 'btn', 'cta'] as const;
export const STRUCTURAL_CONTENT_SELECTOR = 'article, section, li';
export const PRIORITY_CONTENT_SELECTOR = 'main, article, [class*="content"], [class*="feed"]';
export const SIDEBAR_OR_FOOTER_SELECTOR = 'aside, footer, [class*="sidebar"], [id*="sidebar"]';
export const CHROME_CONTAINER_SELECTOR = 'nav, header, footer';
export const LABELLED_AD_CONTAINER_SELECTOR =
  'aside, footer, [class*="sidebar"], [id*="sidebar"], [class*="banner"], [id*="banner"]';
