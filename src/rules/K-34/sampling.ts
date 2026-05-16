import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import {
  MAX_SAMPLE_LENGTH,
  MAX_SAMPLES,
  MAX_SAMPLES_PER_REGION,
  MIN_SAMPLE_WORDS,
  REGION_SELECTORS
} from './constants';
import { CollectedTextSample, FlaggedRegion } from './types';

function hasVisibleBox(element: HTMLElement): boolean {
  const rect = element.getBoundingClientRect();
  return rect.width > 0 && rect.height > 0;
}

function isVisibleElement(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    element.isConnected &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0 &&
    hasVisibleBox(element)
  );
}

function getWordCount(text: string): number {
  return text
    .split(/\s+/)
    .map((part) => part.trim())
    .filter((part) => part.length > 0).length;
}

function isPurelyNumericOrPriceText(text: string): boolean {
  return !/[\p{L}\p{M}]/u.test(text);
}

export function normalizeRegion(region: string): string {
  return region.trim().toLowerCase();
}

export function findMatchingSample(flagged: FlaggedRegion, samples: CollectedTextSample[]): CollectedTextSample | null {
  const normalizedRegion = normalizeRegion(flagged.region);
  const normalizedFlaggedText = normalizeWhitespace(flagged.text);

  const exactMatch = samples.find(
    (sample) => normalizeRegion(sample.region) === normalizedRegion && normalizeWhitespace(sample.text) === normalizedFlaggedText
  );

  if (exactMatch !== undefined) {
    return exactMatch;
  }

  const fuzzyMatch = samples.find((sample) => {
    if (normalizeRegion(sample.region) !== normalizedRegion) {
      return false;
    }

    const normalizedSampleText = normalizeWhitespace(sample.text);
    return normalizedSampleText.includes(normalizedFlaggedText) || normalizedFlaggedText.includes(normalizedSampleText);
  });

  return fuzzyMatch ?? null;
}

export function isIntentionallyMultilingual(doc: Document = document): boolean {
  const htmlLang = normalizeRegion(doc.documentElement.lang);
  const hasLangSwitcher =
    doc.querySelector('[class*="lang-switch"], [class*="language-select"], [id*="lang-switch"]') !== null;
  const langedSections = doc.querySelectorAll('main[lang], article[lang], section[lang]');

  return htmlLang === 'mul' || hasLangSwitcher || langedSections.length >= 2;
}

export function collectTextSamples(doc: Document = document): CollectedTextSample[] {
  const samples: CollectedTextSample[] = [];
  const seenSelectors = new Set<string>();
  const seenTexts = new Set<string>();

  for (const config of REGION_SELECTORS) {
    let regionCount = 0;
    const elements = Array.from(doc.querySelectorAll<HTMLElement>(config.selector));

    for (const element of elements) {
      if (samples.length >= MAX_SAMPLES || regionCount >= MAX_SAMPLES_PER_REGION) {
        break;
      }

      if (!isVisibleElement(element)) {
        continue;
      }

      const text = normalizeWhitespace(element.textContent ?? '');

      if (getWordCount(text) < MIN_SAMPLE_WORDS) {
        continue;
      }

      const truncatedText = text.slice(0, MAX_SAMPLE_LENGTH);

      if (isPurelyNumericOrPriceText(truncatedText)) {
        continue;
      }

      const selector = generateUniqueSelector(element);
      const dedupeKey = `${normalizeRegion(config.region)}::${truncatedText.toLowerCase()}`;

      if (seenSelectors.has(selector) || seenTexts.has(dedupeKey)) {
        continue;
      }

      seenSelectors.add(selector);
      seenTexts.add(dedupeKey);
      samples.push({
        region: config.region,
        text: truncatedText,
        selector,
        boundingBox: hasVisibleBox(element) ? element.getBoundingClientRect() : null
      });
      regionCount += 1;
    }

    if (samples.length >= MAX_SAMPLES) {
      break;
    }
  }

  return samples;
}
