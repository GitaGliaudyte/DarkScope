export const RULE_ID = 'K-61';

export const LIVE_TEXT_SELECTOR = 'span, div, p, small, strong, b, em, li, label, h1, h2, h3, h4, h5, h6, button, a';

export const DISCOURAGEMENT_PATTERNS = [
  /don't\s+miss\s+(?:it|out|this)/i,
  /you('ll|ll|\s+will)\s+regret\s+(?:it|this)/i,
  /shame/i,
  /no,\s+(?:I\s+)?want\s+to\s+overpay/i,
  /are\s+you\s+sure/i,
  /this\s+is\s+(?:your\s+)?last\s+chance/i,
  /don't\s+let\s+this\s+(?:deal|offer|discount|opportunity)\s+go/i,
  /wait[!,.]?\s+don't\s+go/i,
  /wait[!,.]?\s+come\s+back/i,
  /I\s+don't\s+want\s+to\s+save/i,
  /keep\s+my\s+(?:subscription|membership|plan)/i,
  /I\s+(?:like|enjoy|love)\s+paying\s+(?:full\s+price|more)/i,
  /no\s+thanks,\s+I\s+(?:like|enjoy|love)\s+paying/i,
  /only\s+losers\s+quit/i,
  /stay\s+and\s+save/i,
  /you're\s+about\s+to\s+lose/i,
  /don't\s+abandon\s+(?:your\s+)?(?:cart|order|purchase)/i,
  /are\s+you\s+sure\s+you\s+want\s+to\s+leave/i,
  /are\s+you\s+sure\s+you\s+want\s+to\s+(?:cancel|decline|quit|remove)/i,
  /don't\s+go\s+yet/i,
  /your\s+progress\s+will\s+be\s+lost/i,
  /you\s+might\s+regret\s+this/i,
  /don't\s+make\s+a\s+mistake/i,
  /think\s+twice/i,
  /reconsider/i,
  /we'd\s+hate\s+to\s+see\s+you\s+go/i,
  /we'll\s+miss\s+you/i,
  /don't\s+leave\s+(?:money|savings)\s+on\s+the\s+table/i,
  /no,\s+I\s+want\s+to\s+miss\s+out/i,
  /no,\s+I\s+prefer\s+to\s+pay\s+full\s+price/i
] as const;

export const CANCELLATION_KEYWORDS = ['cancel', 'decline', 'refuse', 'reject', 'unsubscribe', 'opt out', 'opt-out', 'skip', 'exit', 'close', 'dismiss', 'no thanks', 'no, thanks'] as const;

export const EXCLUDED_CONTEXT = ['opening hours', 'schedule', 'timetable', 'business hours', 'contact hours'] as const;
