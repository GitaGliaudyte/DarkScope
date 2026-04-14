import { findCountdownTimers } from '../rules/findCountdownTimers';

interface QuestionResult {
  probability: number;
  evidence: {
    timerCount: number;
    timerTexts: string[];
  };
  elements: HTMLElement[];
}

/**
 * Detects fake urgency dark pattern through countdown timers.
 * @returns QuestionResult | null - Question result or null if no timers found
 */
export function Q2_fakeUrgency(): QuestionResult | null {
  const timers = findCountdownTimers();

  if (timers.length === 0) {
    return null;
  }

  // Simple heuristic: presence of timers indicates potential fake urgency
  // Could be enhanced with more sophisticated analysis
  const probability = Math.min(timers.length * 0.3, 1); // Scale by count, max 1

  return {
    probability,
    evidence: {
      timerCount: timers.length,
      timerTexts: timers.map(timer => timer.textContent || timer.innerText || '').slice(0, 5) // Limit to first 5
    },
    elements: timers
  };
}