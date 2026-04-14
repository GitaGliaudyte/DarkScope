/**
 * Scans the DOM for countdown timer elements.
 * @returns HTMLElement[] - Array of timer elements found
 */
export function findCountdownTimers(): HTMLElement[] {
  const timers = document.querySelectorAll('[class*="timer"], [class*="countdown"], [id*="timer"], [id*="countdown"]');
  return Array.from(timers) as HTMLElement[];
}