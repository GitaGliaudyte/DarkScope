import { Confidence } from '../../engine/types';

export function scoreSignupData(extraFieldsCount: number): number {
  if (extraFieldsCount <= 0) {
    return 0;
  }

  const severity = Math.min(3 + extraFieldsCount, 10);

  return severity;
}

export function getConfidence(score: number): Confidence {
  if (score >= 7) return 'high';
  if (score >= 4) return 'medium';
  if (score >= 1) return 'low';
  return 'low';
}
