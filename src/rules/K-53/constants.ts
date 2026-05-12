export const RULE_ID = 'K-53';

export const LIVE_TEXT_SELECTOR = 'span, div, p, small, strong, b, em, li, label, h1, h2, h3, h4, h5, h6';

export const HIGH_DEMAND_PATTERNS = [
  /high\s+demand/i,
  /selling\s+out\s+quickly/i,
  /selling\s+fast/i,
  /in\s+high\s+demand/i,
  /popular\s+(?:item|product|choice)/i,
  /trending\s+now/i,
  /flying\s+off\s+the\s+shelves/i,
  /back\s+in\s+demand/i,
  /hot\s+(?:item|product|seller)/i,
  /top\s+seller/i,
  /best\s+seller/i,
  /bestseller/i,
  /most\s+popular/i,
  /everyone\s+is\s+buying/i,
  /people\s+are\s+viewing/i,
  /\d+\s+people\s+(?:viewed|bought|interested)/i
] as const;

export const EXCLUDED_CONTEXT = ['opening hours', 'schedule', 'timetable', 'business hours', 'contact hours'] as const;
