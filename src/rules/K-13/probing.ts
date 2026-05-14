import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import {
  AD_CANDIDATE_SELECTOR,
  AD_NETWORKS,
  DATA_ATTRIBUTE_KEYWORDS,
  DISCLOSURE_TERMS,
  EXACT_AD_ATTRIBUTES,
  ID_CLASS_COMPOUND_PATTERNS,
  ID_CLASS_EXACT_TOKENS,
  KNOWN_SCRIPT_ID_PREFIXES,
  MAX_CANDIDATES,
  MAX_DISCLOSURE_CONTAINER_HOPS,
  MAX_DESCENDANT_TEXT_NODES,
  MAX_EVIDENCE_TEXT_LENGTH,
  MAX_NEARBY_DISCLOSURE_AREA_RATIO,
  MAX_NEARBY_DISCLOSURE_DISTANCE_PX,
  MAX_NEARBY_DISCLOSURE_HEIGHT_PX,
  MAX_VISUAL_TARGET_HEIGHT_RATIO,
  MAX_VISUAL_TARGET_WIDTH_RATIO,
  MIN_VISUAL_TARGET_AREA_PX,
  MIN_VISUAL_TARGET_HEIGHT_PX,
  MIN_VISUAL_TARGET_WIDTH_PX,
  MIN_VISIBLE_FONT_SIZE_PX,
  VISUAL_DESCENDANT_SELECTOR
} from './constants';
import { CandidateMatch, CandidateMatchType, DisclosureStatus, RuleFinding } from './types';

function normalizeValue(value: string | null | undefined): string {
  return normalizeWhitespace((value ?? '').toLowerCase());
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createDisclosurePattern(term: string): RegExp {
  const escapedTerm = escapeRegex(term).replace(/\s+/g, '\\s+');
  return new RegExp(`(?:^|[^a-z0-9])${escapedTerm}(?=$|[^a-z0-9])`, 'i');
}

const DISCLOSURE_PATTERNS = DISCLOSURE_TERMS.map((term) => createDisclosurePattern(term));

function matchesDisclosureTerm(value: string | null | undefined): boolean {
  const normalized = normalizeValue(value);
  return normalized.length > 0 && DISCLOSURE_PATTERNS.some((pattern) => pattern.test(normalized));
}

function hasRenderableStyle(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0 &&
    element.getClientRects().length > 0
  );
}

function hasVisibleTextStyle(element: HTMLElement): boolean {
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0 &&
    Number.parseFloat(style.fontSize || '0') >= MIN_VISIBLE_FONT_SIZE_PX &&
    element.getClientRects().length > 0
  );
}

function getNetworkFromValue(value: string): string | null {
  const normalized = normalizeValue(value);

  for (const network of AD_NETWORKS) {
    if (normalized.includes(network.match) || normalized.includes(network.name)) {
      return network.name;
    }
  }

  return null;
}

function getIdentifierTokens(value: string): string[] {
  return normalizeValue(value)
    .split(/[^a-z0-9]+/i)
    .filter((token) => token.length > 0);
}

function matchesIdOrClassPattern(value: string): boolean {
  const normalized = normalizeValue(value);

  if (normalized.length === 0) {
    return false;
  }

  const tokens = getIdentifierTokens(normalized);
  const tokenText = tokens.join(' ');

  return (
    tokens.some((token) => ID_CLASS_EXACT_TOKENS.includes(token as (typeof ID_CLASS_EXACT_TOKENS)[number])) ||
    ID_CLASS_COMPOUND_PATTERNS.some((pattern) => tokenText.includes(pattern)) ||
    AD_NETWORKS.some((network) => normalized.includes(network.name) || normalized.includes(network.match))
  );
}

function hasAdLikeDataAttribute(element: Element): boolean {
  return Array.from(element.attributes).some((attribute) => {
    const name = attribute.name.toLowerCase();
    const key = name.startsWith('data-') ? name.slice(5) : '';
    const value = normalizeValue(attribute.value);

    if (!name.startsWith('data-')) {
      return false;
    }

    if (EXACT_AD_ATTRIBUTES.includes(name as (typeof EXACT_AD_ATTRIBUTES)[number])) {
      return true;
    }

    return (
      matchesIdOrClassPattern(key) ||
      DATA_ATTRIBUTE_KEYWORDS.some((keyword) => key.includes(keyword)) ||
      getNetworkFromValue(value) !== null ||
      matchesIdOrClassPattern(value)
    );
  });
}

function getKnownScriptNetwork(id: string): string | null {
  if (id.startsWith('google_ads_iframe') || id.startsWith('div-gpt-ad')) {
    return 'doubleclick';
  }

  if (id.startsWith('taboola-')) {
    return 'taboola';
  }

  return null;
}

function hasKnownScriptId(element: HTMLElement): boolean {
  const id = normalizeValue(element.id);
  return element.tagName.toLowerCase() === 'div' && KNOWN_SCRIPT_ID_PREFIXES.some((prefix) => id.startsWith(prefix));
}

function isInherentAdRenderElement(element: HTMLElement): boolean {
  const tag = element.tagName.toLowerCase();
  return tag === 'iframe' || tag === 'ins' || tag === 'object' || tag === 'embed';
}

function hasStrongAdDescendant(element: HTMLElement): boolean {
  return Array.from(element.querySelectorAll<HTMLElement>(VISUAL_DESCENDANT_SELECTOR)).some(
    (descendant) => descendant !== element && hasRenderableStyle(descendant)
  );
}

function hasDirectAdSignal(element: HTMLElement): boolean {
  const id = normalizeValue(element.id);
  const className = typeof element.className === 'string' ? normalizeValue(element.className) : '';

  if (element instanceof HTMLIFrameElement) {
    return getNetworkFromValue(element.getAttribute('src') ?? '') !== null;
  }

  return (
    hasKnownScriptId(element) ||
    hasAdLikeDataAttribute(element) ||
    matchesIdOrClassPattern(id) ||
    matchesIdOrClassPattern(className)
  );
}

function resolveIframeContainer(iframe: HTMLIFrameElement): HTMLElement {
  const parent = iframe.parentElement;

  if (
    parent !== null &&
    parent !== document.body &&
    parent !== document.documentElement &&
    hasRenderableStyle(parent) &&
    (parent.children.length === 1 || matchesIdOrClassPattern(`${parent.id} ${parent.className}`) || hasAdLikeDataAttribute(parent))
  ) {
    return parent;
  }

  return iframe;
}

function getCandidateMatch(element: Element): { container: HTMLElement; matchType: CandidateMatchType; network: string | null } | null {
  if (!(element instanceof HTMLElement) || !element.isConnected || !hasRenderableStyle(element)) {
    return null;
  }

  const id = normalizeValue(element.id);
  const className = typeof element.className === 'string' ? normalizeValue(element.className) : '';

  if (element instanceof HTMLIFrameElement) {
    const src = normalizeValue(element.getAttribute('src'));
    const network = getNetworkFromValue(src);

    if (network !== null) {
      return {
        container: resolveIframeContainer(element),
        matchType: 'iframe',
        network
      };
    }
  }

  if (element.tagName.toLowerCase() === 'div' && KNOWN_SCRIPT_ID_PREFIXES.some((prefix) => id.startsWith(prefix))) {
    return {
      container: element,
      matchType: 'known_script',
      network: getKnownScriptNetwork(id)
    };
  }

  if (hasAdLikeDataAttribute(element)) {
    return {
      container: element,
      matchType: 'attribute',
      network: getNetworkFromValue(`${id} ${className}`)
    };
  }

  if ((matchesIdOrClassPattern(id) || matchesIdOrClassPattern(className)) && (isInherentAdRenderElement(element) || hasStrongAdDescendant(element))) {
    return {
      container: element,
      matchType: 'attribute',
      network: getNetworkFromValue(`${id} ${className}`)
    };
  }

  return null;
}

function getElementDepth(element: HTMLElement): number {
  let depth = 0;
  let current: HTMLElement | null = element;

  while (current !== null && current !== document.body) {
    depth += 1;
    current = current.parentElement;
  }

  return depth;
}

function getElementRect(element: HTMLElement): DOMRect {
  return element.getBoundingClientRect();
}

function getRectArea(rect: DOMRect): number {
  return Math.max(0, rect.width) * Math.max(0, rect.height);
}

function isMinimumVisualTarget(rect: DOMRect): boolean {
  return (
    rect.width >= MIN_VISUAL_TARGET_WIDTH_PX &&
    rect.height >= MIN_VISUAL_TARGET_HEIGHT_PX &&
    getRectArea(rect) >= MIN_VISUAL_TARGET_AREA_PX
  );
}

function isOversizedVisualTarget(rect: DOMRect): boolean {
  return (
    rect.width > window.innerWidth * MAX_VISUAL_TARGET_WIDTH_RATIO ||
    rect.height > window.innerHeight * MAX_VISUAL_TARGET_HEIGHT_RATIO
  );
}

function isReasonableVisualTarget(element: HTMLElement): boolean {
  if (!hasRenderableStyle(element)) {
    return false;
  }

  const rect = getElementRect(element);
  return isMinimumVisualTarget(rect) && !isOversizedVisualTarget(rect);
}

function chooseBestDescendantVisualTarget(container: HTMLElement): HTMLElement | null {
  const descendants = Array.from(container.querySelectorAll<HTMLElement>(VISUAL_DESCENDANT_SELECTOR)).filter(
    (element) =>
      element !== container &&
      hasRenderableStyle(element) &&
      isMinimumVisualTarget(getElementRect(element)) &&
      (hasDirectAdSignal(element) || isInherentAdRenderElement(element))
  );

  if (descendants.length === 0) {
    return null;
  }

  return descendants
    .sort((left, right) => {
      const leftArea = getRectArea(getElementRect(left));
      const rightArea = getRectArea(getElementRect(right));
      const leftPenalty = isOversizedVisualTarget(getElementRect(left)) ? 1 : 0;
      const rightPenalty = isOversizedVisualTarget(getElementRect(right)) ? 1 : 0;

      if (leftPenalty !== rightPenalty) {
        return leftPenalty - rightPenalty;
      }

      return rightArea - leftArea;
    })[0];
}

function resolveVisualTargetElement(container: HTMLElement): HTMLElement | null {
  if (isReasonableVisualTarget(container)) {
    return container;
  }

  const descendantTarget = chooseBestDescendantVisualTarget(container);

  if (descendantTarget !== null && !isOversizedVisualTarget(getElementRect(descendantTarget))) {
    return descendantTarget;
  }

  if (descendantTarget !== null) {
    return descendantTarget;
  }

  return isMinimumVisualTarget(getElementRect(container)) ? container : null;
}

export function collectCandidateMatches(): CandidateMatch[] {
  const rawElements = Array.from(document.querySelectorAll<HTMLElement>(AD_CANDIDATE_SELECTOR));
  const deduped = new Map<HTMLElement, CandidateMatch>();

  for (const element of rawElements) {
    const match = getCandidateMatch(element);

    if (match === null) {
      continue;
    }

    const existing = deduped.get(match.container);

    if (existing === undefined || (existing.network === null && match.network !== null)) {
      deduped.set(match.container, {
        container: match.container,
        selector: generateUniqueSelector(match.container),
        matchType: match.matchType,
        network: match.network,
        boundingBox: match.container.getBoundingClientRect()
      });
    }
  }

  return Array.from(deduped.values())
    .sort((left, right) => getElementDepth(left.container) - getElementDepth(right.container))
    .filter((candidate, index, candidates) => {
      return !candidates.slice(0, index).some((previous) => previous.container.contains(candidate.container));
    })
    .slice(0, MAX_CANDIDATES);
}

function getVisibleDisclosureText(container: HTMLElement): string | null {
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT);
  let visited = 0;

  while (visited < MAX_DESCENDANT_TEXT_NODES) {
    const current = walker.nextNode();

    if (current === null) {
      break;
    }

    visited += 1;

    const textNode = current as Text;
    const text = normalizeWhitespace(textNode.textContent ?? '');

    if (text.length === 0 || !matchesDisclosureTerm(text)) {
      continue;
    }

    const parent = textNode.parentElement;

    if (parent === null || !hasVisibleTextStyle(parent)) {
      continue;
    }

    return text.slice(0, MAX_EVIDENCE_TEXT_LENGTH);
  }

  return null;
}

function getRectGap(left: DOMRect, right: DOMRect): number {
  const horizontalGap = Math.max(0, Math.max(left.left - right.right, right.left - left.right));
  const verticalGap = Math.max(0, Math.max(left.top - right.bottom, right.top - left.bottom));

  return Math.hypot(horizontalGap, verticalGap);
}

function getHorizontalOverlapRatio(left: DOMRect, right: DOMRect): number {
  const overlap = Math.max(0, Math.min(left.right, right.right) - Math.max(left.left, right.left));
  return overlap / Math.max(1, Math.min(left.width, right.width));
}

function getVerticalOverlapRatio(left: DOMRect, right: DOMRect): number {
  const overlap = Math.max(0, Math.min(left.bottom, right.bottom) - Math.max(left.top, right.top));
  return overlap / Math.max(1, Math.min(left.height, right.height));
}

function isNearbyDisclosureElement(element: HTMLElement, containerRect: DOMRect, containerArea: number): boolean {
  if (!hasVisibleTextStyle(element)) {
    return false;
  }

  const rect = element.getBoundingClientRect();

  if (
    getRectArea(rect) === 0 ||
    rect.height > MAX_NEARBY_DISCLOSURE_HEIGHT_PX ||
    getRectArea(rect) > Math.max(MIN_VISUAL_TARGET_AREA_PX, containerArea * MAX_NEARBY_DISCLOSURE_AREA_RATIO)
  ) {
    return false;
  }

  const gap = getRectGap(rect, containerRect);

  if (gap > MAX_NEARBY_DISCLOSURE_DISTANCE_PX) {
    return false;
  }

  return gap <= 16 || getHorizontalOverlapRatio(rect, containerRect) >= 0.25 || getVerticalOverlapRatio(rect, containerRect) >= 0.5;
}

function getElementDisclosureText(element: HTMLElement): string | null {
  const text = normalizeWhitespace(element.textContent ?? '');

  if (text.length === 0 || !matchesDisclosureTerm(text)) {
    return null;
  }

  return text.slice(0, MAX_EVIDENCE_TEXT_LENGTH);
}

function getNearbyDisclosureText(container: HTMLElement): string | null {
  const containerRect = container.getBoundingClientRect();
  const containerArea = getRectArea(containerRect);
  const visited = new Set<HTMLElement>();

  let current: HTMLElement | null = container;
  let hops = 0;

  while (current !== null && current.parentElement !== null && hops < MAX_DISCLOSURE_CONTAINER_HOPS) {
    const parentElement: HTMLElement = current.parentElement;

    for (const sibling of Array.from(parentElement.children)) {
      if (!(sibling instanceof HTMLElement) || sibling === current || visited.has(sibling)) {
        continue;
      }

      visited.add(sibling);

      if (!isNearbyDisclosureElement(sibling, containerRect, containerArea)) {
        continue;
      }

      const siblingDisclosure = getElementDisclosureText(sibling);

      if (siblingDisclosure !== null) {
        return siblingDisclosure;
      }
    }

    current = parentElement;
    hops += 1;
  }

  return null;
}

function getMachineDisclosureText(container: HTMLElement): string | null {
  const candidates: HTMLElement[] = [container, ...Array.from(container.querySelectorAll<HTMLElement>('[aria-label], [title]'))];

  for (const candidate of candidates) {
    const ariaLabel = candidate.getAttribute('aria-label');

    if (matchesDisclosureTerm(ariaLabel)) {
      return normalizeWhitespace(ariaLabel ?? '').slice(0, MAX_EVIDENCE_TEXT_LENGTH);
    }

    const title = candidate.getAttribute('title');

    if (matchesDisclosureTerm(title)) {
      return normalizeWhitespace(title ?? '').slice(0, MAX_EVIDENCE_TEXT_LENGTH);
    }
  }

  return null;
}

function classifyDisclosure(container: HTMLElement): { status: DisclosureStatus; text: string | null } {
  const visibleText = getVisibleDisclosureText(container);

  if (visibleText !== null) {
    return { status: 'disclosed', text: visibleText };
  }

  const nearbyText = getNearbyDisclosureText(container);

  if (nearbyText !== null) {
    return { status: 'disclosed', text: nearbyText };
  }

  const machineText = getMachineDisclosureText(container);

  if (machineText !== null) {
    return { status: 'machine_only', text: machineText };
  }

  return { status: 'undisclosed', text: null };
}

function getFallbackEvidenceText(container: HTMLElement, network: string | null): string {
  const text = normalizeWhitespace(container.textContent ?? '');

  if (text.length > 0) {
    return text.slice(0, MAX_EVIDENCE_TEXT_LENGTH);
  }

  const identity = normalizeWhitespace(
    [container.tagName.toLowerCase(), container.id, typeof container.className === 'string' ? container.className : '', network ?? '']
      .filter((value) => value.length > 0)
      .join(' ')
  );

  return identity.slice(0, MAX_EVIDENCE_TEXT_LENGTH);
}

function isAboveFold(container: HTMLElement): boolean {
  return container.getBoundingClientRect().top < window.innerHeight;
}

export function buildFinding(candidate: CandidateMatch): RuleFinding | null {
  const disclosure = classifyDisclosure(candidate.container);

  if (disclosure.status === 'disclosed') {
    return null;
  }

  const visualTarget = resolveVisualTargetElement(candidate.container);

  if (visualTarget === null) {
    return null;
  }

  return {
    container: candidate.container,
    selector: candidate.selector,
    visualSelector: generateUniqueSelector(visualTarget),
    disclosure: disclosure.status,
    network: candidate.network,
    aboveFold: isAboveFold(candidate.container),
    text: disclosure.text ?? getFallbackEvidenceText(candidate.container, candidate.network),
    boundingBox: visualTarget.getBoundingClientRect()
  };
}
