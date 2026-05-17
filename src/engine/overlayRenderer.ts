// This file draws and maintains non-interactive overlay highlights over detected dark pattern targets.
import { getRuleColor } from './ruleColors';
import { RuleResult } from './types';

const OVERLAY_ID = '__darkscope_overlay';
const HIGHLIGHT_PADDING = 4;

interface HighlightRecord {
  ruleId: string;
  element: HTMLElement;
  box: HTMLDivElement;
}

let trackedHighlights: HighlightRecord[] = [];
let scrollListenerAttached = false;
let activePulseTimeout: number | null = null;

function createOverlayRoot(): HTMLDivElement {
  const root = document.createElement('div');
  root.id = OVERLAY_ID;
  root.style.position = 'fixed';
  root.style.top = '0';
  root.style.left = '0';
  root.style.width = '100vw';
  root.style.height = '100vh';
  root.style.overflow = 'hidden';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '2147483647';
  return root;
}

function canHighlightElement(element: HTMLElement): boolean {
  if (!element.isConnected) {
    return false;
  }

  const style = window.getComputedStyle(element);
  const rect = element.getBoundingClientRect();

  return (
    rect.width > 0 &&
    rect.height > 0 &&
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    Number.parseFloat(style.opacity || '1') > 0
  );
}

function positionHighlight(record: HighlightRecord): void {
  if (!canHighlightElement(record.element)) {
    record.box.style.display = 'none';
    return;
  }

  const rect = record.element.getBoundingClientRect();
  const left = rect.left - HIGHLIGHT_PADDING;
  const top = rect.top - HIGHLIGHT_PADDING;
  const width = rect.width + HIGHLIGHT_PADDING * 2;
  const height = rect.height + HIGHLIGHT_PADDING * 2;
  const isOutsideViewport =
    left >= window.innerWidth ||
    top >= window.innerHeight ||
    left + width <= 0 ||
    top + height <= 0;

  if (isOutsideViewport) {
    record.box.style.display = 'none';
    return;
  }

  record.box.style.display = 'block';
  record.box.style.position = 'absolute';
  record.box.style.left = `${left}px`;
  record.box.style.top = `${top}px`;
  record.box.style.width = `${width}px`;
  record.box.style.height = `${height}px`;
}

function repositionHighlights(): void {
  trackedHighlights = trackedHighlights.filter((record) => {
    if (!record.element.isConnected) {
      record.box.remove();
      return false;
    }

    positionHighlight(record);
    return true;
  });
}

function clearPulse(box: HTMLDivElement): void {
  box.style.transform = '';
  box.style.boxShadow = '';
  box.style.transition = '';
  box.style.zIndex = '';
}

function addOverlayListeners(): void {
  if (scrollListenerAttached) {
    return;
  }

  window.addEventListener('scroll', repositionHighlights, true);
  window.addEventListener('resize', repositionHighlights);
  scrollListenerAttached = true;
}

function removeOverlayListeners(): void {
  if (!scrollListenerAttached) {
    return;
  }

  window.removeEventListener('scroll', repositionHighlights, true);
  window.removeEventListener('resize', repositionHighlights);
  scrollListenerAttached = false;
}

export function removeHighlights(): void {
  document.getElementById(OVERLAY_ID)?.remove();
  trackedHighlights = [];
  if (activePulseTimeout !== null) {
    window.clearTimeout(activePulseTimeout);
    activePulseTimeout = null;
  }
  removeOverlayListeners();
}

export function drawHighlights(results: RuleResult[]): void {
  removeHighlights();

  const overlayRoot = createOverlayRoot();

  for (const result of results) {
    if (!result.detected) {
      continue;
    }

    for (const selector of result.visualTarget.selectors) {
      const element = document.querySelector<HTMLElement>(selector);

      if (element === null || !canHighlightElement(element)) {
        continue;
      }

      const color = getRuleColor(result.ruleId);
      const box = document.createElement('div');
      box.style.border = `2px solid ${color.border}`;
      box.style.background = color.background;
      box.style.borderRadius = '4px';
      box.style.boxSizing = 'border-box';

      const label = document.createElement('div');
      label.textContent = result.ruleId;
      label.style.position = 'absolute';
      label.style.top = '-20px';
      label.style.left = '0';
      label.style.padding = '2px 6px';
      label.style.borderRadius = '4px';
      label.style.background = color.label;
      label.style.color = '#ffffff';
      label.style.fontSize = '11px';
      label.style.fontFamily = 'system-ui, sans-serif';
      label.style.lineHeight = '1.2';

      box.appendChild(label);
      overlayRoot.appendChild(box);
      trackedHighlights.push({ ruleId: result.ruleId, element, box });
      positionHighlight({ ruleId: result.ruleId, element, box });
    }
  }

  document.body.appendChild(overlayRoot);
  addOverlayListeners();
  repositionHighlights();
}

export function setOverlayEnabled(enabled: boolean, results: RuleResult[]): void {
  if (enabled) {
    drawHighlights(results);
    return;
  }

  removeHighlights();
}

export function focusFirstHighlight(ruleId: string): boolean {
  repositionHighlights();

  const match = trackedHighlights
    .filter((record) => record.ruleId === ruleId && canHighlightElement(record.element))
    .sort((left, right) => {
      const leftRect = left.element.getBoundingClientRect();
      const rightRect = right.element.getBoundingClientRect();
      const leftTop = leftRect.top + window.scrollY;
      const rightTop = rightRect.top + window.scrollY;

      if (leftTop !== rightTop) {
        return leftTop - rightTop;
      }

      return leftRect.left - rightRect.left;
    })[0];

  if (match === undefined) {
    return false;
  }

  match.element.scrollIntoView({
    behavior: 'smooth',
    block: 'center',
    inline: 'nearest'
  });

  positionHighlight(match);

  if (activePulseTimeout !== null) {
    window.clearTimeout(activePulseTimeout);
    activePulseTimeout = null;
  }

  trackedHighlights.forEach((record) => clearPulse(record.box));

  match.box.style.transition = 'transform 180ms ease, box-shadow 180ms ease';
  match.box.style.transform = 'scale(1.12)';
  match.box.style.boxShadow = '0 0 0 8px rgba(15, 23, 42, 0.18)';
  match.box.style.zIndex = '1';

  activePulseTimeout = window.setTimeout(() => {
    clearPulse(match.box);
    activePulseTimeout = null;
  }, 1200);

  return true;
}
