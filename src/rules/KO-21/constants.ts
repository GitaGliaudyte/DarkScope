export const RULE_ID = 'KO-21';

export const LIVE_TEXT_SELECTOR = 'span, div, p, small, strong, b, em, li, label, h1, h2, h3, h4, h5, h6';

export const USER_ACTIVITY_PATTERNS = [
  /\d+\s+(?:people|users|customers|shoppers|person)\s+(?:are\s+viewing|viewed|watching|looking\s+at)/i,
  /(?:someone|somebody|\w+)\s+just\s+(?:bought|purchased|ordered|added)/i,
  /recently\s+(?:bought|purchased|sold|added)/i,
  /\d+\s+(?:people|users|customers)\s+have\s+(?:bought|purchased|added)/i,
  /(?:\d+[KkMm\+]*)\s+(?:sold|bought|purchased)\s+in\s+(?:the\s+)?(?:last|past)\s+(?:day|week|month|hour|24\s*(?:hours?|hrs?)|48\s*(?:hours?|hrs?)|7\s*days?|30\s*days?)/i,
  /\d+\s+(?:people|users|customers)\s+have\s+this\s+in\s+their\s+cart/i,
  /\d+\s+(?:people|users|customers)\s+added\s+this\s+to\s+(?:cart|bag)/i,
  /\d+\s+(?:others?|people|users|customers)\s+are\s+(?:interested|looking)/i,
  /(?:x\s+people|many\s+people|\d+\s+people)\s+viewed\s+this/i,
  /\d+\s+(?:active\s+)?viewers?/i,
  /\d+\s+(?:active\s+)?users?\s+online/i,
  /(?:just\s+)?sold\s+\d+/i,
  /(?:\d+[KkMm\+]*)\s+(?:bought|purchased|sold)\s+in\s+(?:the\s+)?(?:past|last)\s+(?:day|week|month|hour|24\s*(?:hours?|hrs?)|48\s*(?:hours?|hrs?)|7\s*days?|30\s*days?)/i,
  /(?:\d+[KkMm\+]*)\s+(?:bought|purchased|sold)\s+within\s+(?:the\s+)?(?:last|past)\s+(?:\d+[KkMm\+]*)?\s*(?:day|week|month|hour|minute)s?/i,
  /(?:bought|purchased|sold)\s+(?:over\s+|more\s+than\s+|at\s+least\s+)?(?:\d+[KkMm\+]*)\s+times?\s+in\s+(?:the\s+)?(?:last|past)\s+(?:day|week|month|hour|24\s*(?:hours?|hrs?)|48\s*(?:hours?|hrs?))/i,
  /popular\s+right\s+now\s+with\s+\d+/i,
  /\d+\s+viewing\s+now/i,
  /\d+\s+currently\s+viewing/i
] as const;
