export const RULE_ID = 'K-51';

export const MEDIA_SELECTOR = 'video, audio, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="autoplay"]';

export const CAROUSEL_SELECTORS = [
  '[data-autoplay="true"]',
  '[data-auto-play="true"]',
  '[data-slider="true"]',
  '.carousel',
  '.slider',
  '.swiper',
  '.slick-slider',
  '[class*="carousel"]',
  '[class*="slider"]',
  '[class*="swiper"]'
] as const;

export const AUTOPLAY_INDICATORS = [
  'autoplay',
  'auto-play',
  'data-autoplay',
  'data-auto-play'
] as const;
