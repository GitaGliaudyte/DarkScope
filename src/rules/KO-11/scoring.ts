import { Confidence } from '../../engine/types';
import { AVATAR_SELECTORS, EMOJI_PATTERNS, EMOTIONAL_WORDS, EXCLUSION_SELECTORS, CHAT_CONTEXT_SELECTORS, USER_MESSAGE_SELECTORS, BOT_MESSAGE_SELECTORS } from './constants';

export function containsEmojis(text: string): boolean {
  return EMOJI_PATTERNS.some((pattern) => pattern.test(text));
}

export function containsEmotionalWords(text: string): boolean {
  const normalized = text.toLowerCase();
  return EMOTIONAL_WORDS.some((word) => normalized.includes(word));
}

export function isExcludedContext(element: HTMLElement): boolean {
  return EXCLUSION_SELECTORS.some((selector) => element.closest(selector) !== null);
}

export function hasAvatar(element: HTMLElement): boolean {
  if (element.matches(AVATAR_SELECTORS.join(', '))) {
    return true;
  }
  const avatarElements = element.querySelectorAll(AVATAR_SELECTORS.join(', '));
  if (avatarElements.length > 0) {
    return true;
  }
  
  const images = element.tagName.toLowerCase() === 'img' ? [element as HTMLImageElement] : Array.from(element.querySelectorAll('img'));
  for (const img of images) {
    const alt = (img.getAttribute('alt') || '').toLowerCase();
    const className = (img.className || '').toLowerCase();
    const src = (img.getAttribute('src') || '').toLowerCase();
    if (alt.includes('avatar') || className.includes('avatar') || src.includes('avatar') || alt.includes('bot')) {
      return true;
    }
  }
  return false;
}

export function hasEmojis(element: HTMLElement): boolean {
  const text = element.textContent || '';
  if (containsEmojis(text)) {
    return true;
  }
  return element.querySelector('img[alt*="emoji"], [class*="emoji"], i[class*="em-"]') !== null || 
         (element.tagName.toLowerCase() === 'img' && (element.getAttribute('alt') || '').includes('emoji'));
}

export function hasEmotionalWords(element: HTMLElement): boolean {
  const text = element.textContent || '';
  return containsEmotionalWords(text);
}

export function isInsideChat(element: HTMLElement): boolean {
  return CHAT_CONTEXT_SELECTORS.some((selector) => element.closest(selector) !== null);
}

export function isUserMessage(element: HTMLElement): boolean {
  return USER_MESSAGE_SELECTORS.some((selector) => element.closest(selector) !== null);
}

export function isBotMessage(element: HTMLElement): boolean {
  return BOT_MESSAGE_SELECTORS.some((selector) => element.closest(selector) !== null);
}


export function scoreSignals(liveElement: HTMLElement): number {
  if (isExcludedContext(liveElement)) {
    return 0;
  }

  if (!isInsideChat(liveElement)) {
    return 0;
  }

  if (isUserMessage(liveElement)) {
    return 0;
  }
  
  const SadlerAvatarFeature = hasAvatar(liveElement);
  const SadlerEmojiFeature = hasEmojis(liveElement);
  const SadlerEmotionalWordsFeature = hasEmotionalWords(liveElement);
  const botContext = isBotMessage(liveElement);
  
  if (!SadlerAvatarFeature && !SadlerEmojiFeature && !SadlerEmotionalWordsFeature) {
    return 0;
  }
  
  let score = 0;
  if (SadlerAvatarFeature) score += 3;
  if (SadlerEmojiFeature) score += 2;
  if (SadlerEmotionalWordsFeature) score += 2;
  if (botContext) score += 3;

  return Math.min(score, 10);
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) return 'high';
  if (score >= 2) return 'medium';
  return 'low';
}
