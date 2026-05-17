export const RULE_ID = 'K-26';

export const AVATAR_SELECTORS = [
  'img[alt*="avatar"]',
  'img[class*="avatar"]',
  'img[id*="avatar"]',
  '.avatar',
  '[class*="avatar-container"]',
  '[class*="bot-avatar"]',
  '[class*="chat-avatar"]',
  '[style*="border-radius: 50%"]',
  '[style*="border-radius:50%"]'
] as const;

export const EMOJI_PATTERNS = [
  /[\u{1F300}-\u{1F9FF}]/u,
  /[\u{1F600}-\u{1F64F}]/u,
  /[\u{1F680}-\u{1F6FF}]/u,
  /[\u{2600}-\u{26FF}]/u,
  /[\u{2700}-\u{27BF}]/u,
  /[\u{1E000}-\u{1FBF9}]/u
] as const;

export const EMOTIONAL_WORDS = [
  'happy', 'sad', 'excited', 'sorry', 'glad', 'love', 'smile', 'enjoy', 
  'delighted', 'pleased', 'anxious', 'worried', 'afraid', 'angry', 'frustrated',
  'hopeful', 'optimistic', 'encouraging', 'positive', 'lonely', 'alone', 
  'enthusiastic', 'eager', 'calm', 'relaxed', 'peaceful', 'stressed', 
  'overwhelmed', 'comfortable', 'at ease', 'uncomfortable', 'uneasy', 'awkward'
] as const;

export const EXCLUSION_SELECTORS = [
  '.nav',
  '.navigation',
  '.menu',
  '.header',
  '.footer',
  'head',
  'script',
  'style'
] as const;