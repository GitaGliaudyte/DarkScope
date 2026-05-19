export const RULE_ID = 'KO-25';

export const PERSONALIZATION_INDICATORS = [
  /for you/i,
  /recommended for you/i,
  /suggested for you/i,
  /because you viewed/i,
  /based on your activity/i,
  /personalized/i,
  /tailored/i,
  /custom feed/i,
  /your interests/i,
  /your preferences/i,
  /featured recommendations/i,
  /recently viewed items/i,
  /your browsing history/i,
  /your recently viewed/i,
  /inspired by your/i,
  /picked for you/i,
  /curated for you/i,
  /based on your browsing/i,
  /because you searched/i,
  /related to your/i
];

export const PERSONALIZATION_DISABLE_PATTERNS = [
  /disable personalization/i,
  /turn off personalization/i,
  /turn off recommendations/i,
  /stop using my data/i,
  /clear personalization/i,
  /manage personalization/i,
  /privacy settings/i,
  /ad personalization/i,
  /content preferences/i,
  /opt out/i,
  /opt-out/i
];

export const PERSONALIZATION_DISABLE_SELECTORS = [
  'button[id*="personal"]',
  'button[class*="personal"]',
  'button[id*="privacy"]',
  'button[class*="privacy"]',
  'a[href*="personal"]',
  'a[href*="privacy"]',
  'a[href*="settings"]',
  '[role="switch"]',
  '[aria-checked]',
  '.privacy-cookie-settings',
  '#manage-cookies'
];

export const EXCLUSION_PATTERNS = [
  /review/i, 
  /rating/i, 
  /testimonial/i,
  /best seller/i, 
  /top seller/i, 
  /trending/i, 
  /deal of the day/i, 
  /clearance/i,
  /frequently bought together/i, 
  /frequently purchased/i, 
  /compatible with/i,
  /subscribe/i, 
  /newsletter/i
];

export const EXCLUSION_SELECTORS = [
  'footer', 
  'nav',
  '[id*="review"]', 
  '[class*="review"]', 
  '[id*="rating"]', 
  '[class*="rating"]', 
  '[id*="testimonial"]', 
  '[class*="testimonial"]', 
  '.comments', 
  '#comments',
  '.reviews',
  '#reviews',
  '[class*="cart"]', 
  '[id*="cart"]', 
  '[class*="checkout"]', 
  '[id*="checkout"]', 
  '[class*="frequently-bought"]',
  '[class*="navigation"]', 
  '[class*="sidebar"]',
  '[id*="menu"]',
  '[class*="menu"]'
];
