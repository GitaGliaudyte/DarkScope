interface ActionButtons {
  optIn: HTMLElement | null;
  optOut: HTMLElement | null;
}

/**
 * Scans the DOM for action buttons and links, detecting opt-in and opt-out elements.
 * @returns {ActionButtons} { optIn: HTMLElement | null, optOut: HTMLElement | null }
 */
export function findActionButtons(): ActionButtons {
  // Include standard buttons and elements that act like buttons
  const selectors = [
    'button',
    'a',
    'input[type="button"]',
    'input[type="submit"]',
    '[role="button"]',
    '.button',
    '.btn',
    '[class*="button"]',
    '[class*="btn"]'
  ];
  
  const elements = document.querySelectorAll(selectors.join(', '));
  console.log(`findActionButtons: Found ${elements.length} potential button elements`);

  let optIn: HTMLElement | null = null;
  let optOut: HTMLElement | null = null;

  const optInKeywords = ['accept', 'agree', 'allow', 'yes', 'confirm', 'accept all', 'accept all cookies', 'accept cookies', 'subscribe'];
  const optOutKeywords = ['reject', 'decline', 'no', 'cancel', 'manage', 'settings', 'preferences', 'no, adjust', 'deny'];

  /**
   * Check if text contains a keyword using word boundary matching
   * Avoid false positives from longer descriptive text
   */
  const matchesKeyword = (text: string, keywords: string[]): boolean => {
    // Filter out long text (usually not button labels)
    if (text.length > 150) return false;
    
    return keywords.some(keyword => {
      // Use strict word boundary matching
      const regex = new RegExp(`\\b${keyword}\\b`, 'i');
      return regex.test(text);
    });
  };

  for (const element of elements) {
    const text = (element as HTMLElement).textContent?.toLowerCase().trim() || '';
    const value = (element as HTMLInputElement).value?.toLowerCase().trim() || '';
    const combinedText = (text || value).replace(/\s+/g, ' '); // Normalize whitespace

    if (!optIn && matchesKeyword(combinedText, optInKeywords)) {
      optIn = element as HTMLElement;
      console.log('Found optIn:', combinedText);
    }
    if (!optOut && matchesKeyword(combinedText, optOutKeywords)) {
      optOut = element as HTMLElement;
      console.log('Found optOut:', combinedText);
    }

    if (optIn && optOut) break;
  }

  console.log('findActionButtons result:', { 
    optIn: optIn ? (optIn.textContent || (optIn as HTMLInputElement).value || 'no text') : null,
    optOut: optOut ? (optOut.textContent || (optOut as HTMLInputElement).value || 'no text') : null
  });

  return { optIn, optOut };
}