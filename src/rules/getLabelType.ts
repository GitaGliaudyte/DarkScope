/**
 * Determines the label type of an element based on its text content.
 * @param element - The HTMLElement to evaluate
 * @returns "clear", "vague", or "unknown"
 */
export function getLabelType(element: HTMLElement | null): "clear" | "vague" | "unknown" {
  if (!element) return "unknown";

  const text = element.textContent?.toLowerCase() || (element as HTMLInputElement).value?.toLowerCase() || '';

  const clearKeywords = ['reject', 'decline', 'no', 'cancel'];
  const vagueKeywords = ['manage', 'settings', 'preferences', 'options'];

  if (clearKeywords.some(keyword => text.includes(keyword))) {
    return "clear";
  }
  if (vagueKeywords.some(keyword => text.includes(keyword))) {
    return "vague";
  }

  return "unknown";
}