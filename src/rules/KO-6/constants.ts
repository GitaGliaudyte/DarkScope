export const RULE_ID = 'KO-6';
export const MAX_CANDIDATES = 50;
export const MAX_DESCENDANT_TEXT_NODES = 200;
export const MIN_VISIBLE_FONT_SIZE_PX = 8;
export const MAX_EVIDENCE_TEXT_LENGTH = 200;
export const MAX_DISCLOSURE_CONTAINER_HOPS = 2;
export const MAX_NEARBY_DISCLOSURE_DISTANCE_PX = 96;
export const MAX_NEARBY_DISCLOSURE_HEIGHT_PX = 80;
export const MAX_NEARBY_DISCLOSURE_AREA_RATIO = 0.4;
export const MIN_VISUAL_TARGET_WIDTH_PX = 40;
export const MIN_VISUAL_TARGET_HEIGHT_PX = 20;
export const MIN_VISUAL_TARGET_AREA_PX = 1200;
export const MAX_VISUAL_TARGET_WIDTH_RATIO = 0.92;
export const MAX_VISUAL_TARGET_HEIGHT_RATIO = 0.8;
export const VISUAL_DESCENDANT_SELECTOR = [
  'iframe',
  'ins',
  'object',
  'embed',
  'ins.adsbygoogle',
  '[id^="google_ads_iframe"]',
  '[id^="div-gpt-ad"]',
  '[id^="taboola-"]',
  '[data-ad]',
  '[data-ad-unit]',
  '[data-ad-slot]',
  '[data-dfp]',
  '[data-google-query-id]',
  '[data-ad-client]',
  '[class~="ad"]',
  '[class~="ads"]',
  '[class~="sponsored"]',
  '[class~="advertisement"]',
  '[class~="affiliate"]',
  '[class*="ad-slot"]',
  '[class*="ad_slot"]',
  '[class*="adunit"]',
  '[class*="ad-unit"]',
  '[class*="adsbygoogle"]',
  '[class*="sponsored-content"]',
  '[class*="partner-content"]',
  '[class*="paid-content"]',
  '[class*="advertisement"]'
].join(', ');

export const EXACT_AD_ATTRIBUTES = [
  'data-ad',
  'data-ad-unit',
  'data-ad-slot',
  'data-dfp',
  'data-google-query-id',
  'data-ad-client'
] as const;

export const DATA_ATTRIBUTE_KEYWORDS = [
  'ad',
  'ads',
  'advertisement',
  'advertising',
  'advertorial',
  'sponsor',
  'sponsored',
  'affiliate',
  'promoted'
] as const;
export const ID_CLASS_EXACT_TOKENS = [
  'ad',
  'ads',
  'advertisement',
  'advertising',
  'advertorial',
  'sponsor',
  'sponsored',
  'affiliate',
  'promoted',
  'taboola',
  'outbrain',
  'revcontent',
  'mgid',
  'dfp',
  'adsense',
  'teads',
  'doubleclick',
  'googlesyndication'
] as const;
export const ID_CLASS_COMPOUND_PATTERNS = [
  'ad slot',
  'ad unit',
  'ads by google',
  'sponsored content',
  'partner content',
  'paid content',
  'affiliate content'
] as const;

export const AD_NETWORKS = [
  { name: 'doubleclick', match: 'doubleclick.net', major: true },
  { name: 'googlesyndication', match: 'googlesyndication.com', major: true },
  { name: 'adnxs', match: 'adnxs.com', major: false },
  { name: 'taboola', match: 'taboola.com', major: true },
  { name: 'outbrain', match: 'outbrain.com', major: true },
  { name: 'revcontent', match: 'revcontent.com', major: false },
  { name: 'mgid', match: 'mgid.com', major: false },
  { name: 'teads', match: 'teads.tv', major: false },
  { name: 'media.net', match: 'media.net', major: false },
  { name: 'criteo', match: 'criteo.com', major: false },
  { name: 'amazon-adsystem', match: 'amazon-adsystem.com', major: false }
] as const;

export const KNOWN_SCRIPT_ID_PREFIXES = ['google_ads_iframe', 'div-gpt-ad', 'taboola-'] as const;

export const DISCLOSURE_TERMS = [
  'ad',
  'ads',
  'advertisement',
  'advertorial',
  'sponsored',
  'sponsorship',
  'promoted',
  'promotion',
  'partner content',
  'paid content',
  'paid post',
  'commercial content'
] as const;

export const AD_CANDIDATE_SELECTOR = [
  'iframe[src*="doubleclick.net"]',
  'iframe[src*="googlesyndication.com"]',
  'iframe[src*="adnxs.com"]',
  'iframe[src*="taboola.com"]',
  'iframe[src*="outbrain.com"]',
  'iframe[src*="revcontent.com"]',
  'iframe[src*="mgid.com"]',
  'iframe[src*="teads.tv"]',
  'iframe[src*="media.net"]',
  'iframe[src*="criteo.com"]',
  'iframe[src*="amazon-adsystem.com"]',
  'ins.adsbygoogle',
  '[id^="google_ads_iframe"]',
  '[id^="div-gpt-ad"]',
  '[id^="taboola-"]',
  '[data-ad]',
  '[data-ad-unit]',
  '[data-ad-slot]',
  '[data-dfp]',
  '[data-google-query-id]',
  '[data-ad-client]',
  '[class~="ad"]',
  '[class~="ads"]',
  '[class~="sponsored"]',
  '[class~="advertisement"]',
  '[class~="affiliate"]',
  '[class*="ad-slot"]',
  '[class*="ad_slot"]',
  '[class*="adunit"]',
  '[class*="ad-unit"]',
  '[class*="adsbygoogle"]',
  '[class*="sponsored-content"]',
  '[class*="partner-content"]',
  '[class*="paid-content"]',
  '[class*="advertisement"]',
  '[id*="adslot"]',
  '[id*="ad-slot"]',
  '[id*="adsbygoogle"]',
  '[id*="sponsored"]',
  '[id*="taboola"]',
  '[id*="outbrain"]',
  '[id*="revcontent"]',
  '[id*="mgid"]'
].join(', ');
