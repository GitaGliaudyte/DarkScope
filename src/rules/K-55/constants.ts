export const RULE_ID = 'K-55';

export const LIVE_TEXT_SELECTOR = 'span, div, p, small, strong, b, em, li, label, h1, h2, h3, h4, h5, h6';

export const QUANTITY_PATTERNS = [
  /only\s+\d+\s+left/i,
  /\d+\s+left\s+(?:in\s+stock)?/i,
  /limited\s+(?:stock|quantity|supply)/i,
  /low\s+stock/i,
  /last\s+(?:one|item|piece|chance)/i,
  /few\s+left/i,
  /\d+\s+remaining/i,
  /only\s+a\s+few\s+left/i,
  /selling\s+fast/i,
  /almost\s+gone/i,
  /out\s+of\s+stock\s+soon/i,
  /\d+\s+in\s+stock/i,
  /only\s+\d+\s+available/i,
  /hurry.*\d+\s+left/i,
  /just\s+\d+\s+left/i
] as const;

export const STOCK_IDENTIFIER_PATTERN = /stock|quantity|inventory|availability|scarcity|left|remaining/;

export const URGENCY_CLASS_PATTERN = /\b(?:urgent|alert|warning|scarcity|stock|low-stock|out-of-stock|hurry|countdown|timer|badge|highlight|emphasis|promo|flash)\b/;

export const EXCLUDED_CONTEXT = ['opening hours', 'schedule', 'timetable', 'business hours', 'contact hours'] as const;
