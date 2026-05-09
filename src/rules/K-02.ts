// This file detects missing account deletion controls on account settings pages using live DOM heuristics.
import { defaultPageClassifier } from '../engine/pageClassifier';
import { generateUniqueSelector, isVisibleElement, normalizeWhitespace } from '../engine/normalizedElements';
import { AnalysisContext, Confidence, RuleDefinition, RuleResult } from '../engine/types';

const DELETION_CONTROL_SELECTOR = 'button, a, input[type="submit"], input[type="button"], [role="button"], summary, details';
const HIDDEN_CONTAINER_SELECTOR = '[class*="hidden"], [class*="collapsed"], [aria-hidden="true"]';
const LOW_CONTRAST_CLASS_PATTERN = /invisible|sr-only|visually-hidden/i;
const PROFILE_FIELD_PATTERN = /name|username|display name|bio/i;

const DELETION_GROUPS = {
  A: [
    ['delete', 'account'],
    ['remove', 'account'],
    ['delete', 'profile'],
    ['close', 'account'],
    ['terminate', 'account'],
    ['erase', 'account']
  ],
  B: [
    ['deactivate', 'account'],
    ['disable', 'account'],
    ['suspend', 'account'],
    ['deactivate', 'profile']
  ],
  C: [
    ['right', 'erasure'],
    ['erase', 'data'],
    ['delete', 'data'],
    ['remove', 'data'],
    ['request', 'deletion'],
    ['data', 'deletion']
  ],
  D: ['delete', 'deactivate', 'close-account', 'remove-account', 'erasure']
} as const;

const PASSWORD_TEXT_SIGNALS = ['change password', 'update password', 'new password'] as const;
const EMAIL_TEXT_SIGNALS = ['change email', 'update email', 'email address'] as const;
const NOTIFICATION_TEXT_SIGNALS = [
  'notifications',
  'email preferences',
  'communication settings',
  'marketing emails'
] as const;

interface DeletionSignal {
  element: Element;
  selector: string;
  text: string;
  matchedGroup: 'A' | 'B' | 'C' | 'D';
  visible: boolean;
}

interface HiddenDeletionSignal {
  element: Element;
  reason: 'display_none' | 'aria_hidden' | 'visually_hidden';
}

function normalizeValue(value: string | null | undefined): string {
  return normalizeWhitespace(value ?? '').toLowerCase();
}

function tokenizeSearchValue(value: string): string[] {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, ' ')
    .trim()
    .split(/\s+/)
    .filter((token) => token.length > 0);
}

function matchesOrderedTokens(value: string, tokens: readonly string[], maxGap = 3): boolean {
  const haystack = tokenizeSearchValue(value);
  let previousIndex = -1;

  for (const token of tokens) {
    const nextIndex = haystack.findIndex((part, index) => index > previousIndex && part === token);

    if (nextIndex === -1) {
      return false;
    }

    if (previousIndex !== -1 && nextIndex - previousIndex - 1 > maxGap) {
      return false;
    }

    previousIndex = nextIndex;
  }

  return true;
}

function getElementText(element: Element): string {
  if (element instanceof HTMLInputElement) {
    return normalizeWhitespace(element.value);
  }

  return normalizeWhitespace(element.textContent ?? '');
}

function getElementSearchFields(element: Element): { text: string; href: string; ariaLabel: string } {
  return {
    text: normalizeValue(getElementText(element)),
    href: normalizeValue(element.getAttribute('href')),
    ariaLabel: normalizeValue(element.getAttribute('aria-label'))
  };
}

function matchDeletionGroup(element: Element): DeletionSignal['matchedGroup'] | null {
  const fields = getElementSearchFields(element);

  for (const tokens of DELETION_GROUPS.A) {
    if (
      matchesOrderedTokens(fields.text, tokens) ||
      matchesOrderedTokens(fields.href, tokens) ||
      matchesOrderedTokens(fields.ariaLabel, tokens)
    ) {
      return 'A';
    }
  }

  for (const tokens of DELETION_GROUPS.B) {
    if (
      matchesOrderedTokens(fields.text, tokens) ||
      matchesOrderedTokens(fields.href, tokens) ||
      matchesOrderedTokens(fields.ariaLabel, tokens)
    ) {
      return 'B';
    }
  }

  for (const tokens of DELETION_GROUPS.C) {
    if (
      matchesOrderedTokens(fields.text, tokens) ||
      matchesOrderedTokens(fields.href, tokens) ||
      matchesOrderedTokens(fields.ariaLabel, tokens)
    ) {
      return 'C';
    }
  }

  for (const keyword of DELETION_GROUPS.D) {
    if (fields.href.includes(keyword)) {
      return 'D';
    }
  }

  return null;
}

function hasDeletionKeywordText(element: Element): boolean {
  const fields = getElementSearchFields(element);
  return (
    DELETION_GROUPS.A.some(
      (tokens) => matchesOrderedTokens(fields.text, tokens) || matchesOrderedTokens(fields.ariaLabel, tokens)
    ) ||
    DELETION_GROUPS.B.some(
      (tokens) => matchesOrderedTokens(fields.text, tokens) || matchesOrderedTokens(fields.ariaLabel, tokens)
    ) ||
    DELETION_GROUPS.C.some(
      (tokens) => matchesOrderedTokens(fields.text, tokens) || matchesOrderedTokens(fields.ariaLabel, tokens)
    )
  );
}

function hasDeletionKeywordHref(element: Element): boolean {
  const href = normalizeValue(element.getAttribute('href'));
  return DELETION_GROUPS.D.some((keyword) => href.includes(keyword));
}

function classifyHiddenReason(element: Element): HiddenDeletionSignal['reason'] | null {
  const htmlElement = element instanceof HTMLElement ? element : null;
  const computedStyle = htmlElement === null ? null : window.getComputedStyle(htmlElement);
  const className = element.getAttribute('class') ?? '';

  if (computedStyle !== null) {
    if (computedStyle.display === 'none' || computedStyle.visibility === 'hidden') {
      return 'display_none';
    }

    if (computedStyle.opacity === '0') {
      return 'visually_hidden';
    }
  }

  const hiddenContainer = element.closest(HIDDEN_CONTAINER_SELECTOR);

  if (hiddenContainer?.getAttribute('aria-hidden') === 'true') {
    return 'aria_hidden';
  }

  if (hiddenContainer !== null || LOW_CONTRAST_CLASS_PATTERN.test(className)) {
    return 'visually_hidden';
  }

  if (element instanceof HTMLAnchorElement && computedStyle !== null) {
    const backgroundColor = computedStyle.backgroundColor.replace(/\s+/g, '');
    const color = computedStyle.color.replace(/\s+/g, '');

    if (color.length > 0 && color === backgroundColor) {
      return 'visually_hidden';
    }
  }

  return null;
}

function isAccessibleElement(element: Element): boolean {
  if (!(element instanceof HTMLElement)) {
    return false;
  }

  const computedStyle = window.getComputedStyle(element);
  return isVisibleElement(element) && computedStyle.opacity !== '0';
}

export function findDeletionCandidates(): {
  deletionSignals: DeletionSignal[];
  hiddenSignals: HiddenDeletionSignal[];
} {
  const deletionSignals: DeletionSignal[] = [];
  const hiddenSignals: HiddenDeletionSignal[] = [];
  const hiddenKeys = new Set<string>();

  for (const element of Array.from(document.querySelectorAll<Element>(DELETION_CONTROL_SELECTOR))) {
    const matchedGroup = matchDeletionGroup(element);

    if (matchedGroup === null) {
      continue;
    }

    const selector = generateUniqueSelector(element);
    deletionSignals.push({
      element,
      selector,
      text: getElementText(element) || normalizeWhitespace(element.getAttribute('href') ?? ''),
      matchedGroup,
      visible: isAccessibleElement(element)
    });
  }

  for (const element of Array.from(document.querySelectorAll<Element>('body *'))) {
    const matchesDeletionText = hasDeletionKeywordText(element);
    const matchesDeletionHref = element instanceof HTMLAnchorElement && hasDeletionKeywordHref(element);

    if (!matchesDeletionText && !matchesDeletionHref) {
      continue;
    }

    const reason = classifyHiddenReason(element);

    if (reason === null) {
      continue;
    }

    const key = `${generateUniqueSelector(element)}::${reason}`;

    if (hiddenKeys.has(key)) {
      continue;
    }

    hiddenKeys.add(key);
    hiddenSignals.push({ element, reason });
  }

  return { deletionSignals, hiddenSignals };
}

function getInteractiveElementCount(snapshot: AnalysisContext['snapshot']): number {
  const selectors = new Set<string>();

  for (const link of snapshot.links) {
    selectors.add(link.selector);
  }

  for (const button of snapshot.buttons) {
    selectors.add(button.selector);
  }

  for (const element of snapshot.elements) {
    if (element.tag === 'input') {
      selectors.add(element.selector);
    }
  }

  return selectors.size;
}

function snapshotTextIncludes(snapshot: AnalysisContext['snapshot'], phrases: readonly string[]): boolean {
  const haystack = snapshot.text.toLowerCase();
  return phrases.some((phrase) => haystack.includes(phrase));
}

function hasPasswordControls(snapshot: AnalysisContext['snapshot']): boolean {
  return (
    snapshot.elements.some(
      (element) => element.tag === 'input' && normalizeValue(element.attributes.type) === 'password'
    ) || snapshotTextIncludes(snapshot, PASSWORD_TEXT_SIGNALS)
  );
}

function hasEmailControls(snapshot: AnalysisContext['snapshot']): boolean {
  return (
    snapshot.elements.some((element) => element.tag === 'input' && normalizeValue(element.attributes.type) === 'email') ||
    snapshotTextIncludes(snapshot, EMAIL_TEXT_SIGNALS)
  );
}

function hasNotificationControls(snapshot: AnalysisContext['snapshot']): boolean {
  return snapshotTextIncludes(snapshot, NOTIFICATION_TEXT_SIGNALS);
}

function hasProfileEditControls(snapshot: AnalysisContext['snapshot']): boolean {
  return snapshot.elements.some(
    (element) =>
      element.tag === 'input' &&
      normalizeValue(element.attributes.type) === 'text' &&
      PROFILE_FIELD_PATTERN.test(
        `${normalizeValue(element.attributes.name)} ${normalizeValue(element.attributes.placeholder)}`
      )
  );
}

export function scoreSignals(
  deletionSignals: DeletionSignal[],
  hiddenSignals: HiddenDeletionSignal[],
  snapshot: AnalysisContext['snapshot']
): number {
  if (getInteractiveElementCount(snapshot) < 3) {
    return 0;
  }

  if (deletionSignals.some((signal) => signal.visible)) {
    return 0;
  }

  if (hiddenSignals.length > 0) {
    return 4 + Math.min(hiddenSignals.length, 3);
  }

  if (deletionSignals.length > 0) {
    return 4;
  }

  let score = 5;

  if (hasPasswordControls(snapshot)) {
    score += 2;
  }

  if (hasEmailControls(snapshot)) {
    score += 2;
  }

  if (hasNotificationControls(snapshot)) {
    score += 2;
  }

  if (hasProfileEditControls(snapshot)) {
    score += 1;
  }

  return score;
}

export function getConfidence(score: number): Confidence {
  if (score >= 10) {
    return 'high';
  }

  if (score >= 7) {
    return 'medium';
  }

  return 'low';
}

function clampProbability(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function getEvidenceText(element: Element): string {
  const text = getElementText(element);

  if (text.length > 0) {
    return text.slice(0, 200);
  }

  return normalizeWhitespace(element.getAttribute('href') ?? '').slice(0, 200);
}

function getSummaryHeadingText(): string {
  const headings = [
    normalizeWhitespace(document.querySelector('h1')?.textContent ?? ''),
    ...Array.from(document.querySelectorAll('h2')).map((element) => normalizeWhitespace(element.textContent ?? ''))
  ]
    .filter((text) => text.length > 0)
    .join(' ');

  return headings.slice(0, 200);
}

const K02Rule: RuleDefinition = {
  id: 'K-02',
  pageClassifier: defaultPageClassifier,
  relevantOn: [],
  skipIfNotRelevant: true,
  relevantContexts: ['account_settings'],
  detect(context: AnalysisContext): RuleResult {
    const { deletionSignals, hiddenSignals } = findDeletionCandidates();
    const visibleDeletion = deletionSignals.filter((signal) => signal.visible);

    if (visibleDeletion.length > 0) {
      const firstVisible = visibleDeletion[0];

      return {
        ruleId: 'K-02',
        detected: false,
        status: 'not_detected',
        probability: 0,
        confidence: 'low',
        impact: 'high',
        evidence: [
          {
            selector: firstVisible.selector,
            text: firstVisible.text.slice(0, 200),
            reason: 'Account deletion control found and accessible.',
            boundingBox:
              firstVisible.element instanceof HTMLElement ? firstVisible.element.getBoundingClientRect() : null
          }
        ],
        explanation: '',
        recommendation: '',
        visualTarget: {
          type: 'none',
          selectors: []
        },
        occurrenceCount: 1
      };
    }

    const score = scoreSignals(deletionSignals, hiddenSignals, context.snapshot);

    if (score < 5) {
      return {
        ruleId: 'K-02',
        detected: false,
        status: 'not_detected',
        probability: clampProbability(score / 12),
        confidence: getConfidence(score),
        impact: 'high',
        evidence: [],
        explanation: '',
        recommendation: '',
        visualTarget: {
          type: 'none',
          selectors: []
        },
        occurrenceCount: 0
      };
    }

    const interactiveCount = getInteractiveElementCount(context.snapshot);
    // TODO: Extract a shared detectZone() helper once Evidence supports zone metadata.
    const evidence: RuleResult['evidence'] =
      hiddenSignals.length > 0
        ? hiddenSignals.map((signal) => ({
            selector: generateUniqueSelector(signal.element),
            text: getEvidenceText(signal.element),
            reason: `Account deletion control found but intentionally hidden (${signal.reason})`,
            boundingBox: signal.element instanceof HTMLElement ? signal.element.getBoundingClientRect() : null
          }))
        : [
            {
              selector: 'body',
              text: getSummaryHeadingText(),
              reason: `No account deletion or deactivation controls found. Page contains ${interactiveCount} settings controls but none allow account removal.`,
              boundingBox: null
            }
          ];

    const selectors =
      hiddenSignals.length > 0 ? hiddenSignals.map((signal) => generateUniqueSelector(signal.element)) : [];
    const occurrenceCount = hiddenSignals.length > 0 ? hiddenSignals.length : 1;

    return {
      ruleId: 'K-02',
      detected: true,
      status: 'detected',
      probability: clampProbability(score / 12),
      confidence: getConfidence(score),
      impact: 'high',
      evidence,
      explanation: '',
      recommendation: '',
      visualTarget: {
        type: hiddenSignals.length > 1 ? 'multiple' : hiddenSignals.length === 1 ? 'single' : 'none',
        selectors
      },
      occurrenceCount
    };
  }
};

export default K02Rule;
