import { generateUniqueSelector, normalizeWhitespace } from '../../engine/normalizedElements';
import { COVERAGE_THRESHOLDS, DISMISS_PATTERNS, MAX_CANDIDATES, MIN_ZINDEX, OVERLAY_CLASS_PATTERNS } from './constants';
import { CoverageMeasurement, OverlayClassification } from './types';

interface TopLayerCandidate {
  element: HTMLElement;
  signalScore: number;
  area: number;
}

function normalizeToken(value: string): string {
  return value
    .toLowerCase()
    .replace(/[-_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function getClassIdBlob(element: HTMLElement): string {
  return normalizeToken(`${element.id} ${typeof element.className === 'string' ? element.className : ''}`);
}

function matchesToken(value: string, patterns: readonly string[]): boolean {
  return patterns.some((pattern) => value.includes(normalizeToken(pattern)));
}

function isVisibleCandidate(element: HTMLElement, rect: DOMRect, style: CSSStyleDeclaration): boolean {
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0 &&
    element.isConnected
  );
}

function intersectsViewport(rect: DOMRect): boolean {
  return rect.top < window.innerHeight && rect.bottom > 0 && rect.left < window.innerWidth && rect.right > 0;
}

function isDocumentSizedContainer(
  rect: DOMRect,
  hasPositionSignal: boolean,
  hasRoleSignal: boolean,
  hasClassSignal: boolean
): boolean {
  return (
    rect.width >= window.innerWidth * 0.98 &&
    rect.height >= window.innerHeight * 0.98 &&
    !hasPositionSignal &&
    !hasRoleSignal &&
    !hasClassSignal
  );
}

function getElementText(element: HTMLElement): string {
  const text = normalizeWhitespace(
    [element.getAttribute('aria-label') ?? '', element.getAttribute('title') ?? '', element.textContent ?? '']
      .filter((value) => value.length > 0)
      .join(' ')
  );

  if (text.length > 0) {
    return text.slice(0, 200);
  }

  return normalizeWhitespace(
    `${element.tagName.toLowerCase()} ${element.id} ${typeof element.className === 'string' ? element.className : ''}`
  ).slice(0, 200);
}

function classifyCoverage(coverageRatio: number): OverlayClassification {
  if (coverageRatio >= COVERAGE_THRESHOLDS.fullTakeover) {
    return 'FULL_TAKEOVER';
  }

  if (coverageRatio >= COVERAGE_THRESHOLDS.dominant) {
    return 'DOMINANT';
  }

  return 'LARGE';
}

function rectanglesOverlap(left: DOMRect, right: DOMRect): boolean {
  return left.left < right.right && left.right > right.left && left.top < right.bottom && left.bottom > right.top;
}

function rectContainsPoint(rect: DOMRect, x: number, y: number): boolean {
  return x >= rect.left && x <= rect.right && y >= rect.top && y <= rect.bottom;
}

/**
 * Builds a human-readable reason string for a measured overlay finding.
 */
export function buildReason(measurement: CoverageMeasurement): string {
  const label =
    measurement.classification === 'FULL_TAKEOVER'
      ? 'full takeover overlay'
      : measurement.classification === 'DOMINANT'
        ? 'dominant overlay'
        : 'large overlay';
  const reasonParts = [`${label} covers ${Math.round(measurement.coverageRatio * 100)}% of the viewport`];

  if (measurement.blocksContent) {
    reasonParts.push('blocks content at the viewport center');
  }

  if (measurement.hasDismissMechanism) {
    reasonParts.push('visible dismiss control present');
  } else {
    reasonParts.push('no visible dismiss control');
  }

  return reasonParts.join('; ');
}

/**
 * Collects all visible top-layer candidates before viewport pruning is applied.
 */
export function collectTopLayerCandidateElements(doc: Document = document): HTMLElement[] {
  if (!(doc.body instanceof HTMLElement)) {
    return [];
  }

  const candidates: TopLayerCandidate[] = [];

  for (const node of Array.from(doc.body.querySelectorAll('*'))) {
    if (!(node instanceof HTMLElement)) {
      continue;
    }

    const element = node;
    const style = window.getComputedStyle(element);
    const rect = element.getBoundingClientRect();

    if (!isVisibleCandidate(element, rect, style)) {
      continue;
    }

    if (element === doc.body || element === doc.documentElement) {
      continue;
    }

    const hasPositionSignal = style.position === 'fixed' || style.position === 'sticky';
    const zIndex = Number.parseInt(style.zIndex, 10);
    const hasZIndexSignal = Number.isFinite(zIndex) && zIndex >= MIN_ZINDEX;
    const role = (element.getAttribute('role') ?? '').toLowerCase();
    const hasRoleSignal =
      role === 'dialog' ||
      role === 'alertdialog' ||
      (element.getAttribute('aria-modal') ?? '').toLowerCase() === 'true' ||
      (element.tagName.toLowerCase() === 'dialog' && element.hasAttribute('open'));
    const hasClassSignal = matchesToken(getClassIdBlob(element), OVERLAY_CLASS_PATTERNS);

    if (!hasPositionSignal && !hasZIndexSignal && !hasRoleSignal && !hasClassSignal) {
      continue;
    }

    if (element.closest('nav, header') !== null && !hasPositionSignal) {
      continue;
    }

    if (isDocumentSizedContainer(rect, hasPositionSignal, hasRoleSignal, hasClassSignal)) {
      continue;
    }

    const signalScore =
      (hasRoleSignal ? 4 : 0) + (hasPositionSignal ? 3 : 0) + (hasClassSignal ? 2 : 0) + (hasZIndexSignal ? 1 : 0);

    candidates.push({
      element,
      signalScore,
      area: rect.width * rect.height
    });
  }

  return candidates
    .sort((left, right) => right.signalScore - left.signalScore || right.area - left.area)
    .map((candidate) => candidate.element);
}

function blocksContentAtViewportCenter(element: HTMLElement, rect: DOMRect): boolean {
  const centerX = window.innerWidth / 2;
  const centerY = window.innerHeight / 2;

  if (!rectContainsPoint(rect, centerX, centerY)) {
    return false;
  }

  const stack = document
    .elementsFromPoint(centerX, centerY)
    .filter((entry): entry is HTMLElement => entry instanceof HTMLElement);
  const candidateIndex = stack.findIndex((entry) => entry === element || element.contains(entry));

  if (candidateIndex === -1) {
    return false;
  }

  return stack
    .slice(candidateIndex + 1)
    .some((entry) => entry !== element && !element.contains(entry) && entry !== document.body && entry !== document.documentElement);
}

/**
 * Determines whether the measured overlay findings include simultaneous overlapping layers.
 */
export function hasOverlappingFindings(findings: CoverageMeasurement[]): boolean {
  for (let index = 0; index < findings.length; index += 1) {
    for (let otherIndex = index + 1; otherIndex < findings.length; otherIndex += 1) {
      const left = findings[index];
      const right = findings[otherIndex];

      if (left.element.contains(right.element) || right.element.contains(left.element)) {
        continue;
      }

      if (rectanglesOverlap(left.rect, right.rect)) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Finds visible top-layer candidate elements that should be evaluated by K-20.
 */
export function findTopLayerCandidates(doc: Document = document): HTMLElement[] {
  return collectTopLayerCandidateElements(doc)
    .filter((element) => intersectsViewport(element.getBoundingClientRect()))
    .slice(0, MAX_CANDIDATES);
}

/**
 * Checks whether an overlay exposes a visible close, dismiss, skip, or cancel mechanism.
 */
export function hasDismissMechanism(element: HTMLElement): boolean {
  const candidates = [element, ...Array.from(element.querySelectorAll<HTMLElement>('*'))];

  for (const candidate of candidates) {
    const rect = candidate.getBoundingClientRect();
    const style = window.getComputedStyle(candidate);

    if (!isVisibleCandidate(candidate, rect, style) || !intersectsViewport(rect)) {
      continue;
    }

    if (matchesToken(getClassIdBlob(candidate), DISMISS_PATTERNS.tokens)) {
      return true;
    }

    if (!candidate.matches('button, [role="button"]')) {
      continue;
    }

    const ariaLabel = normalizeToken(candidate.getAttribute('aria-label') ?? '');

    if (matchesToken(ariaLabel, DISMISS_PATTERNS.ariaLabels)) {
      return true;
    }

    const buttonText = normalizeWhitespace(candidate.textContent ?? '').toLowerCase();

    if (DISMISS_PATTERNS.buttonTexts.some((pattern) => buttonText === pattern.toLowerCase())) {
      return true;
    }
  }

  return false;
}

/**
 * Measures the viewport coverage of a top-layer element and classifies it when coverage exceeds 50%.
 */
export function measureCoverage(element: HTMLElement): CoverageMeasurement | null {
  const rect = element.getBoundingClientRect();
  const screenArea = window.innerWidth * window.innerHeight;

  if (screenArea <= 0 || rect.width <= 0 || rect.height <= 0) {
    return null;
  }

  const coverageRatio = (rect.width * rect.height) / screenArea;

  if (coverageRatio <= COVERAGE_THRESHOLDS.large) {
    return null;
  }

  const isAboveFold = intersectsViewport(rect);

  if (!isAboveFold) {
    return null;
  }

  return {
    element,
    selector: generateUniqueSelector(element),
    rect,
    coverageRatio,
    isAboveFold,
    blocksContent: blocksContentAtViewportCenter(element, rect),
    hasDismissMechanism: hasDismissMechanism(element),
    classification: classifyCoverage(coverageRatio),
    text: getElementText(element)
  };
}
