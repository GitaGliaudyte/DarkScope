export const RULE_ID = 'KO-22';
export const TIMER_ATTRIBUTES = ['data-countdown', 'data-timer', 'data-end-time', 'data-target-time'] as const;
export const LIVE_TEXT_SELECTOR = 'span, div, p, small, strong, b, em, li';
export const TIMER_TEXT_PATTERN = /\b(?:\d{1,2}:)?\d{1,2}:\d{2}\b/;
export const FULL_TIMER_TEXT_PATTERN = /\b\d{1,2}:\d{2}:\d{2}\b/;
export const MMSS_TIMER_TEXT_PATTERN = /\b\d{1,2}:\d{2}\b/;
export const TIMER_IDENTIFIER_PATTERN = /countdown|timer|clock/;
export const TIMER_COMPONENT_PATTERN = /countdown|timer/;
export const URGENCY_KEYWORDS = [
  'ends in',
  'limited time',
  'expires',
  'only left',
  'hurry',
  'offer ends',
  'sale ends',
  'today only',
  'last chance',
  'limited time deal',
  'limited time offer'
] as const;
export const TIME_OF_DAY_CONTEXT = ['opening hours', 'schedule', 'timetable'] as const;
