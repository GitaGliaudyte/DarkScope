// This file draws and maintains non-interactive overlay highlights over detected dark pattern targets.
import { RuleResult } from './types';

const OVERLAY_ID = '__darkscope_overlay';
const HIGHLIGHT_PADDING = 4;

interface HighlightRecord {
  element: HTMLElement;
  box: HTMLDivElement;
}

let trackedHighlights: HighlightRecord[] = [];
let scrollListenerAttached = false;

function createOverlayRoot(): HTMLDivElement {
  const root = document.createElement('div');
  root.id = OVERLAY_ID;
  root.style.position = 'fixed';
  root.style.top = '0';
  root.style.left = '0';
  root.style.width = '100vw';
  root.style.height = '100vh';
  root.style.pointerEvents = 'none';
  root.style.zIndex = '2147483647';
  return root;
}

function positionHighlight(record: HighlightRecord): void {
  const rect = record.element.getBoundingClientRect();
  record.box.style.position = 'absolute';
  record.box.style.left = `${Math.max(0, rect.left - HIGHLIGHT_PADDING)}px`;
  record.box.style.top = `${Math.max(0, rect.top - HIGHLIGHT_PADDING)}px`;
  record.box.style.width = `${rect.width + HIGHLIGHT_PADDING * 2}px`;
  record.box.style.height = `${rect.height + HIGHLIGHT_PADDING * 2}px`;
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

      if (element === null || element.offsetParent === null) {
        continue;
      }

      const box = document.createElement('div');
      box.style.border = '2px solid rgba(226,75,74,0.8)';
      box.style.background = 'rgba(226,75,74,0.08)';
      box.style.borderRadius = '4px';
      box.style.boxSizing = 'border-box';

      const label = document.createElement('div');
      label.textContent = result.ruleId;
      label.style.position = 'absolute';
      label.style.top = '-20px';
      label.style.left = '0';
      label.style.padding = '2px 6px';
      label.style.borderRadius = '4px';
      label.style.background = 'rgba(226,75,74,0.9)';
      label.style.color = '#ffffff';
      label.style.fontSize = '11px';
      label.style.fontFamily = 'system-ui, sans-serif';
      label.style.lineHeight = '1.2';

      box.appendChild(label);
      overlayRoot.appendChild(box);
      trackedHighlights.push({ element, box });
      positionHighlight({ element, box });
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
