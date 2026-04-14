/**
 * Calculates the interaction depth heuristic for an element.
 * @param element - The HTMLElement to evaluate
 * @returns number - 0 for direct actions, 1 for indirect
 */
export function getInteractionDepth(element: HTMLElement | null): number {
  if (!element) return 0;

  const text = element.textContent?.toLowerCase() || (element as HTMLInputElement).value?.toLowerCase() || '';

  const directKeywords = ['reject', 'decline', 'no', 'cancel'];
  const indirectKeywords = ['manage', 'settings', 'preferences', 'options'];

  if (directKeywords.some(keyword => text.includes(keyword))) {
    return 0;
  }
  if (indirectKeywords.some(keyword => text.includes(keyword))) {
    return 1;
  }

  return 0; // Default to direct
}