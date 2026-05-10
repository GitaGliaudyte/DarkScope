// This file classifies the live page into a scored page context used for rule gating.
import { Confidence, LlmProxyRequest, LlmProxyResponse, PageContext, PageType } from './types';

interface TypeScore {
  type: PageType;
  total: number;
  layer1: number;
  layer2: number;
  layer3: number;
  signals: string[];
}

interface LayerResult {
  scores: Record<PageType, number>;
  signals: Record<PageType, string[]>;
}

const CLASSIFIABLE_PAGE_TYPES: PageType[] = ['product', 'cart', 'checkout', 'registration', 'account_settings'];

const URL_PATTERNS: Record<PageType, string[]> = {
  product: ['/product', '/item', '/p/', '/dp/', '/sku', '/pd/', '/goods/'],
  cart: ['/cart', '/basket', '/bag'],
  checkout: ['/checkout', '/payment', '/order/new', '/buy'],
  registration: ['/register', '/signup', '/sign-up', '/create-account', '/join', '/new-account'],
  account_settings: ['/account', '/settings', '/profile', '/preferences', '/my-', '/user/'],
  generic: []
};

const META_PATTERNS: Record<PageType, Array<{ selector: string; match: string }>> = {
  product: [
    { selector: 'meta[property="og:type"]', match: 'product' },
    { selector: '[itemtype*="schema.org/Product"]', match: '' },
    { selector: 'meta[name="generator"]', match: 'shopify' }
  ],
  cart: [],
  checkout: [{ selector: '[itemtype*="schema.org/Order"]', match: '' }],
  registration: [],
  account_settings: [],
  generic: []
};

const H1_TITLE_PATTERNS: Record<PageType, string[]> = {
  product: ['product details', 'product description', 'product overview', 'specifications'],
  cart: ['your cart', 'shopping cart', 'basket', 'cart summary'],
  checkout: [
    'order summary',
    'payment details',
    'shipping information',
    'review your order',
    'checkout',
    'complete your order'
  ],
  registration: ['create account', 'sign up', 'register', 'join', 'create your account', 'new account', 'get started'],
  account_settings: [
    'account settings',
    'profile settings',
    'privacy settings',
    'my account',
    'personal information',
    'your account',
    'security settings',
    'notification settings',
    'manage account',
    'edit profile'
  ],
  generic: []
};

const SUPPLEMENTAL_TEXT_PATTERNS: Record<PageType, string[]> = {
  product: [
    'add to cart',
    'add to bag',
    'buy now',
    'in stock',
    'out of stock',
    'free shipping',
    'product details',
    'customer reviews',
    'write a review'
  ],
  cart: [
    'proceed to checkout',
    'update cart',
    'shopping cart',
    'your cart',
    'cart summary',
    'subtotal',
    'remove item',
    'continue shopping',
    'coupon code'
  ],
  checkout: [
    'place order',
    'pay now',
    'complete purchase',
    'confirm order',
    'promo code',
    'coupon code',
    'billing address',
    'shipping address'
  ],
  registration: [
    'already have an account',
    'by signing up',
    'terms of service',
    'create a password',
    'confirm your email',
    'verify your email'
  ],
  account_settings: [
    'save changes',
    'update profile',
    'change password',
    'delete account',
    'deactivate account',
    'two-factor',
    'notification preferences',
    'privacy settings',
    'connected apps',
    'subscription settings'
  ],
  generic: []
};

const SUPPLEMENTAL_EXCLUDE_SELECTORS = [
  'aside',
  'footer',
  '[class*="recommend"]',
  '[class*="related"]',
  '[class*="suggest"]',
  '[class*="similar"]',
  '[class*="upsell"]',
  '[class*="cross-sell"]',
  '[class*="sidebar"]',
  '[class*="widget"]',
  '[class*="promo"]',
  '[aria-label*="recommended"]',
  '[aria-label*="related"]'
] as const;

function createEmptyScores(): Record<PageType, number> {
  return {
    product: 0,
    cart: 0,
    checkout: 0,
    registration: 0,
    account_settings: 0,
    generic: 0
  };
}

function createEmptySignals(): Record<PageType, string[]> {
  return {
    product: [],
    cart: [],
    checkout: [],
    registration: [],
    account_settings: [],
    generic: []
  };
}

function parsePageType(value: string): PageType | null {
  const normalized = value.trim().replace(/"/g, '');
  return ['product', 'cart', 'checkout', 'registration', 'account_settings', 'generic'].includes(normalized)
    ? (normalized as PageType)
    : null;
}

function normalizeText(value: string | null | undefined): string {
  return value?.replace(/\s+/g, ' ').trim().toLowerCase() ?? '';
}

function isExcludedSupplementalElement(element: Element): boolean {
  return SUPPLEMENTAL_EXCLUDE_SELECTORS.some((selector) => {
    try {
      return element.closest(selector) !== null;
    } catch {
      return false;
    }
  });
}

function scoreLayer1(url: string): LayerResult {
  const scores = createEmptyScores();
  const signals = createEmptySignals();
  const normalizedUrl = url.toLowerCase();

  for (const pageType of CLASSIFIABLE_PAGE_TYPES) {
    for (const pattern of URL_PATTERNS[pageType]) {
      if (normalizedUrl.includes(pattern)) {
        scores[pageType] += 4;
        signals[pageType].push(`url:${pattern}`);
      }
    }

    for (const metaPattern of META_PATTERNS[pageType]) {
      const element = document.querySelector(metaPattern.selector);

      if (element === null) {
        continue;
      }

      const content = normalizeText(element.getAttribute('content'));

      if (metaPattern.match === '' || content.includes(metaPattern.match)) {
        scores[pageType] += 4;
        signals[pageType].push(`meta:${metaPattern.selector}`);
      }
    }
  }

  return { scores, signals };
}

function scoreLayer2(): LayerResult {
  const scores = createEmptyScores();
  const signals = createEmptySignals();
  const h1Text = normalizeText(document.querySelector('h1')?.textContent);
  const h2Text = Array.from(document.querySelectorAll('h2'))
    .map((element) => normalizeText(element.textContent))
    .join(' ');
  const titleText = normalizeText(document.title);

  for (const pageType of CLASSIFIABLE_PAGE_TYPES) {
    for (const pattern of H1_TITLE_PATTERNS[pageType]) {
      if (h1Text.includes(pattern)) {
        scores[pageType] += 3;
        signals[pageType].push(`h1:${pattern}`);
      } else if (titleText.includes(pattern)) {
        scores[pageType] += 3;
        signals[pageType].push(`title:${pattern}`);
      } else if (h2Text.includes(pattern)) {
        scores[pageType] += 1;
        signals[pageType].push(`h2:${pattern}`);
      }
    }
  }

  return { scores, signals };
}

function scoreLayer3(): LayerResult {
  const scores = createEmptyScores();
  const signals = createEmptySignals();
  const textFragments: string[] = [];

  const textElements = Array.from(document.querySelectorAll<HTMLElement>('button, label, p, span, li'));

  for (const element of textElements) {
    if (isExcludedSupplementalElement(element)) {
      continue;
    }

    const text = normalizeText(element.textContent);

    if (text.length > 0) {
      textFragments.push(text);
    }
  }

  const inputElements = Array.from(document.querySelectorAll<HTMLInputElement>('input'));

  for (const input of inputElements) {
    if (isExcludedSupplementalElement(input)) {
      continue;
    }

    const text = normalizeText([input.name, input.placeholder].filter((value) => value.length > 0).join(' '));

    if (text.length > 0) {
      textFragments.push(text);
    }
  }

  const supplementalText = textFragments.join(' ').slice(0, 3000);

  for (const pageType of CLASSIFIABLE_PAGE_TYPES) {
    let layerContribution = 0;

    for (const pattern of SUPPLEMENTAL_TEXT_PATTERNS[pageType]) {
      if (!supplementalText.includes(pattern) || layerContribution >= 4) {
        continue;
      }

      layerContribution += 1;
      signals[pageType].push(`text:${pattern}`);
    }

    scores[pageType] = layerContribution;
  }

  return { scores, signals };
}

function combineScores(layer1: LayerResult, layer2: LayerResult, layer3: LayerResult): TypeScore[] {
  return CLASSIFIABLE_PAGE_TYPES.map((pageType) => ({
    type: pageType,
    total: layer1.scores[pageType] + layer2.scores[pageType] + layer3.scores[pageType],
    layer1: layer1.scores[pageType],
    layer2: layer2.scores[pageType],
    layer3: layer3.scores[pageType],
    signals: [...layer1.signals[pageType], ...layer2.signals[pageType], ...layer3.signals[pageType]]
  })).sort((left, right) => {
    if (right.total !== left.total) {
      return right.total - left.total;
    }

    if (right.layer1 !== left.layer1) {
      return right.layer1 - left.layer1;
    }

    if (right.layer2 !== left.layer2) {
      return right.layer2 - left.layer2;
    }

    return right.layer3 - left.layer3;
  });
}

function deriveConfidence(winner: TypeScore): Confidence {
  if (winner.layer1 > 0) {
    return 'high';
  }

  if (winner.layer2 > 0) {
    return 'medium';
  }

  if (winner.layer3 >= 4) {
    return 'medium';
  }

  return 'low';
}

function toPageContextFromWinner(winner: TypeScore, isConflicted: boolean): PageContext {
  const derivedConfidence = deriveConfidence(winner);

  return {
    type: winner.type,
    confidence: isConflicted ? 'medium' : derivedConfidence,
    signals: winner.signals
  };
}

function shouldKeepHeuristicWinner(winner: TypeScore | undefined, llmResult: PageContext): boolean {
  if (winner === undefined || winner.total <= 0) {
    return false;
  }

  return llmResult.type === 'generic';
}

function collectButtonTexts(): string[] {
  return Array.from(document.querySelectorAll<HTMLButtonElement | HTMLInputElement>('button, input[type="submit"]'))
    .map((element) => normalizeText(element instanceof HTMLInputElement ? element.value : element.textContent))
    .filter((value) => value.length > 0)
    .slice(0, 5);
}

function collectInputSummaries(): string[] {
  return Array.from(document.querySelectorAll<HTMLInputElement>('input'))
    .map((element) => {
      const name = normalizeText(element.name);
      const placeholder = normalizeText(element.placeholder);
      return [name, placeholder].filter((value) => value.length > 0).join('/');
    })
    .filter((value) => value.length > 0)
    .slice(0, 5);
}

function buildLlmContext(): string {
  return [
    `url: ${window.location.href}`,
    `title: ${document.title.trim()}`,
    `h1: ${normalizeText(document.querySelector('h1')?.textContent)}`,
    `buttons: ${collectButtonTexts().join(' | ')}`,
    `inputs: ${collectInputSummaries().join(' | ')}`
  ].join('\n');
}

function stripMarkdownFences(value: string): string {
  return value.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function extractPageTypeFromResponse(value: string): PageType | null {
  const normalized = stripMarkdownFences(value).trim().toLowerCase();
  const directMatch = parsePageType(normalized);

  if (directMatch !== null) {
    return directMatch;
  }

  const jsonTypeMatch = normalized.match(/"type"\s*:\s*"([a-z_]+)"/i);

  if (jsonTypeMatch !== null) {
    return parsePageType(jsonTypeMatch[1]);
  }

  const tokenMatch = normalized.match(/\b(product|cart|checkout|registration|account_settings|generic)\b/i);

  if (tokenMatch !== null) {
    return parsePageType(tokenMatch[1]);
  }

  return null;
}

function previewText(value: string): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, 200);
}

function toErrorSignal(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'llm_error:unknown_error';
  }

  const normalized = error.message.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9_:/.-]/g, '').slice(0, 120);
  return `llm_error:${normalized || 'unknown_error'}`;
}

function sendLlmRequest(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const message: LlmProxyRequest = {
      type: 'llm_request',
      payload: { prompt }
    };

    console.log('[DarkScope][LLM] Sending chrome.runtime message', {
      promptPreview: previewText(prompt)
    });

    chrome.runtime.sendMessage(message, (response: LlmProxyResponse | undefined) => {
      if (chrome.runtime.lastError !== undefined) {
        console.error('[DarkScope][LLM] chrome.runtime.sendMessage failed', chrome.runtime.lastError.message);
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response === undefined) {
        console.error('[DarkScope][LLM] Background worker returned undefined response');
        reject(new Error('empty_response'));
        return;
      }

      if ('error' in response) {
        console.error('[DarkScope][LLM] Background worker returned error', response.error);
        reject(new Error(response.error));
        return;
      }

      console.log('[DarkScope][LLM] Background worker returned text', {
        textPreview: previewText(response.text)
      });
      resolve(response.text);
    });
  });
}

async function classifyWithLLM(): Promise<PageContext> {
  const prompt = [
    'Classify this web page into exactly one of these types:',
    'product, cart, checkout, registration, account_settings, generic.',
    '',
    'Important: classify by the PRIMARY purpose of the page, not by supplemental content.',
    'For example, recommended products on an account page should not make it a product page.',
    '',
    'Page context:',
    buildLlmContext(),
    '',
    'Respond with only one lowercase token from this list and nothing else:',
    'product, cart, checkout, registration, account_settings'
  ].join('\n');

  try {
    const raw = await sendLlmRequest(prompt);
    console.log('[DarkScope][LLM] Raw classification payload', {
      rawPreview: previewText(raw)
    });
    const pageType = extractPageTypeFromResponse(raw);

    if (pageType === null) {
      console.error('[DarkScope][LLM] LLM response did not contain a valid page type', {
        rawPreview: previewText(raw)
      });
      return {
        type: 'generic',
        confidence: 'low',
        signals: ['llm_error:invalid_page_type']
      };
    }

    return {
      type: pageType,
      confidence: 'low',
      signals: ['llm_classified']
    };
  } catch (error) {
    console.error('[DarkScope][LLM] classifyWithLLM failed', error);
    return {
      type: 'generic',
      confidence: 'low',
      signals: [toErrorSignal(error)]
    };
  }
}

export async function classifyPageContext(): Promise<PageContext> {
  const url = window.location.href.toLowerCase();
  const layer1 = scoreLayer1(url);
  const layer2 = scoreLayer2();
  const layer3 = scoreLayer3();
  const ranked = combineScores(layer1, layer2, layer3);
  const winner = ranked[0];
  const runnerUp = ranked[1];
  const isConflicted =
    winner !== undefined &&
    runnerUp !== undefined &&
    runnerUp.total > 0 &&
    runnerUp.total >= winner.total * 0.6;

  console.log('layer 1:', layer1);
  console.log('layer 2:', layer2);
  console.log('layer 3:', layer3);
  console.log('winned:', winner);
  console.log('runner up:', runnerUp);

  if (winner === undefined || winner.total < 3 || (isConflicted && winner.layer1 === 0)) {
    const result = await classifyWithLLM();
    console.log('LLM result:', result);

    if (shouldKeepHeuristicWinner(winner, result)) {
      return toPageContextFromWinner(winner, isConflicted);
    }

    return result;
  // }
  //   return classifyWithLLM();
  }

  const derivedConfidence = deriveConfidence(winner);

  if (derivedConfidence === 'low') {
    const result = await classifyWithLLM();
    console.log('LLM result:', result);

    if (shouldKeepHeuristicWinner(winner, result)) {
      return toPageContextFromWinner(winner, isConflicted);
    }

    return result;
    // return classifyWithLLM();
  }

  return toPageContextFromWinner(winner, isConflicted);
}
