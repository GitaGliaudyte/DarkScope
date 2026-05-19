import { Confidence } from '../../engine/types';

export function scoreAutoplay(el: HTMLElement): number {
  const tag = el.tagName.toLowerCase();
  let score = 0;

  if (tag === 'video' || tag === 'audio') {
    const media = el as HTMLMediaElement;

    if (el.hasAttribute('autoplay')) score += 5;

    if (!media.paused) score += 4;

    if (media.muted && el.hasAttribute('playsinline')) score += 3;

    return score;
  }

  if (tag === 'iframe') {
    const src = el.getAttribute('src') ?? '';

    if (src.includes('autoplay=1') || src.includes('autoplay=true')) {
      score += 6;
    }

    return score;
  }

  return 0;
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  return 'low';
}
