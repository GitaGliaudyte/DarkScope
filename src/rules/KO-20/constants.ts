export const RULE_ID = 'KO-20';

export const MIN_REVIEW_TEXT_LENGTH = 40;
export const MIN_REVIEWS_FOR_ANALYSIS = 2;

export const REVIEW_CONTAINER_SELECTORS = [
  'li.review',
  '[data-hook="review"]',
  '.review',
  '.customer-review',
  '.product-review',
  '.review-item'
];

export const REVIEW_TEXT_SELECTORS = [
  '.review-text',
  '.review-body',
  '[data-hook="review-body"]',
  'p'
];

export const STOP_WORDS = new Set([
  'the','and','for','but','with','this','that','was','are','you','your','from',
  'have','had','not','too','very','just','they','them','their','its','our'
]);

export const USER_IDENTIFICATION_PATTERNS = [
  /verified\s+purchase/i,
  /posted\s+by/i,
  /reviewed\s+by/i
];

export const USER_IDENTIFICATION_SELECTORS = [
  '.a-profile-name',
  '.user-name',
  '.author',
  '[data-review-author]'
];

export const EXCLUDED_CONTEXT = [
  'sort by',
  'filter reviews',
  'showing',
  'viewing',
  'results'
];
