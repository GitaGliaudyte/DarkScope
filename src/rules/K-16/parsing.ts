import { normalizeWhitespace } from '../../engine/normalizedElements';
import { CURRENCY_SYMBOLS, DISCOUNT_LABEL_PATTERNS } from './constants';

const CURRENCY_TOKEN_PATTERN = /(?:usd|eur|gbp|pln|sek|nok|dkk|czk|jpy|zÅ‚|kr)/gi;
const ESCAPED_CURRENCY_PATTERN = CURRENCY_SYMBOLS.map((symbol) => symbol.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join(
  '|'
);
const PRICE_TOKEN_SOURCE = `(?:${ESCAPED_CURRENCY_PATTERN})\\s*-?\\d[\\d\\s.,]*|-?\\d[\\d\\s.,]*\\s*(?:${ESCAPED_CURRENCY_PATTERN})`;
const PRICE_WITH_PREFIX_PATTERN = new RegExp(`(?:${ESCAPED_CURRENCY_PATTERN})\\s*-?\\d[\\d\\s.,]*`, 'i');
const PRICE_WITH_SUFFIX_PATTERN = new RegExp(`-?\\d[\\d\\s.,]*\\s*(?:${ESCAPED_CURRENCY_PATTERN})`, 'i');
const PRICE_TOKEN_PATTERN = new RegExp(PRICE_TOKEN_SOURCE, 'gi');
const RANGE_PRICE_SPAN_PATTERN = new RegExp(`${PRICE_TOKEN_SOURCE}\\s*(?:to|[-–—])\\s*${PRICE_TOKEN_SOURCE}`, 'i');
const RANGE_PRICE_PREFIX_PATTERN = new RegExp(
  `\\b(?:from|starting\\s+at|starting\\s+from|starts\\s+at|starts\\s+from|as\\s+low\\s+as|up\\s+to)\\b\\s*${PRICE_TOKEN_SOURCE}`,
  'i'
);

export interface ParsedDiscountLabel {
  type: 'percentage' | 'absolute';
  value: number;
}

function normalizeNumberToken(value: string): string | null {
  const stripped = normalizeWhitespace(value)
    .replace(CURRENCY_TOKEN_PATTERN, '')
    .replace(/[^\d.,\-\s]/g, '')
    .trim();
  const compact = stripped.replace(/\s+/g, '');

  if (!/\d/.test(compact)) {
    return null;
  }

  const commaCount = (compact.match(/,/g) ?? []).length;
  const dotCount = (compact.match(/\./g) ?? []).length;

  if (commaCount > 0 && dotCount > 0) {
    if (compact.lastIndexOf(',') > compact.lastIndexOf('.')) {
      return compact.replace(/\./g, '').replace(',', '.');
    }

    return compact.replace(/,/g, '');
  }

  if (commaCount > 0) {
    if (/,\d{1,2}$/.test(compact)) {
      return compact.replace(/\./g, '').replace(',', '.');
    }

    return compact.replace(/,/g, '');
  }

  if (dotCount > 0) {
    if (/^\d{1,3}(?:\.\d{3})+$/.test(compact)) {
      return compact.replace(/\./g, '');
    }

    if (dotCount > 1 && /\.\d{1,2}$/.test(compact)) {
      const lastDotIndex = compact.lastIndexOf('.');
      return `${compact.slice(0, lastDotIndex).replace(/\./g, '')}${compact.slice(lastDotIndex)}`;
    }
  }

  return compact;
}

/**
 * Extracts the first price-like token from arbitrary element text.
 */
export function extractTextPrice(text: string): string | null {
  const normalized = normalizeWhitespace(text);
  const prefixedMatch = normalized.match(PRICE_WITH_PREFIX_PATTERN);

  if (prefixedMatch !== null) {
    return prefixedMatch[0];
  }

  const suffixedMatch = normalized.match(PRICE_WITH_SUFFIX_PATTERN);
  return suffixedMatch?.[0] ?? null;
}

/**
 * Extracts all price-like tokens from arbitrary element text.
 */
export function extractPriceTokens(text: string): string[] {
  const normalized = normalizeWhitespace(text);
  return normalized.match(PRICE_TOKEN_PATTERN) ?? [];
}

/**
 * Detects "from/to" style price ranges that should not be treated as a single final price.
 */
export function isPriceRangeText(text: string): boolean {
  const normalized = normalizeWhitespace(text.toLowerCase());
  const priceTokens = extractPriceTokens(normalized);

  if (priceTokens.length === 0) {
    return false;
  }

  if (RANGE_PRICE_PREFIX_PATTERN.test(normalized)) {
    return true;
  }

  return priceTokens.length >= 2 && RANGE_PRICE_SPAN_PATTERN.test(normalized);
}

/**
 * Parses a localized price string into a numeric value.
 */
export function parsePrice(text: string): number | null {
  const normalizedToken = normalizeNumberToken(text);

  if (normalizedToken === null) {
    return null;
  }

  const value = Number.parseFloat(normalizedToken);
  return Number.isFinite(value) ? value : null;
}

/**
 * Parses a discount label into either a percentage value or an absolute saving.
 */
export function parseDiscountLabel(text: string): ParsedDiscountLabel | null {
  const normalized = normalizeWhitespace(text.toLowerCase());

  for (const pattern of DISCOUNT_LABEL_PATTERNS.percentage) {
    const match = normalized.match(pattern);

    if (match === null) {
      continue;
    }

    const value = Number.parseFloat(match[1].replace(',', '.'));

    if (Number.isFinite(value)) {
      return {
        type: 'percentage',
        value
      };
    }
  }

  for (const pattern of DISCOUNT_LABEL_PATTERNS.absolute) {
    const match = normalized.match(pattern);

    if (match === null) {
      continue;
    }

    const value = parsePrice(match[1]);

    if (value !== null) {
      return {
        type: 'absolute',
        value: Math.abs(value)
      };
    }
  }

  return null;
}
