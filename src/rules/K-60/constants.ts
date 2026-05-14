export const RULE_ID = 'K-60';

export const LIVE_TEXT_SELECTOR = 'span, div, p, small, strong, b, em, li, label, h1, h2, h3, h4, h5, h6';

export const LIMITED_TIME_PATTERNS = [
  /limited[\s-]time\s+(?:offer|deal|discount|sale)/i,
  /offer\s+ends\s+(?:soon|in|tomorrow|today)/i,
  /deal\s+ends\s+(?:soon|in|tomorrow|today)/i,
  /sale\s+ends\s+(?:soon|in|tomorrow|today)/i,
  /flash\s+sale/i,
  /today\s+only/i,
  /this\s+weekend\s+only/i,
  /ends\s+tonight/i,
  /ends\s+midnight/i,
  /hurry,?\s+offer\s+ends/i,
  /last\s+chance\s+to\s+save/i,
  /special\s+offer\s+ends/i,
  /promotion\s+ends/i,
  /discount\s+expires/i,
  /price\s+goes\s+up/i,
  /offer\s+valid\s+until/i,
  /valid\s+until\s+(?:tomorrow|today|midnight)/i,
  /ends\s+in\s+\d+/i,
  /(?:only|just)\s+\d+\s+(?:hour|day|minute)s?\s+left/i,
  /limited\s+period\s+offer/i,
  /while\s+supplies\s+last/i,
  /(?:sale|offer|deal)\s+closes\s+(?:soon|tonight|tomorrow)/i
] as const;

export const EXCLUDED_CONTEXT = ['opening hours', 'schedule', 'timetable', 'business hours', 'contact hours'] as const;
