// This file draws and maintains non-interactive overlay highlights over detected dark pattern targets.
import { RuleResult } from './types';

const OVERLAY_ID = '__darkscope_overlay';
const HIGHLIGHT_PADDING = 4;
const RULE_COLORS: Record<string, { border: string; background: string; label: string }> = {
  'K-02': { border: 'rgba(230,126,34,0.8)', background: 'rgba(230,126,34,0.08)', label: 'rgba(230,126,34,0.9)' },
  'K-04': { border: 'rgba(226,75,74,0.8)', background: 'rgba(226,75,74,0.08)', label: 'rgba(226,75,74,0.9)' },
  'K-05': { border: 'rgba(234,147,40,0.8)', background: 'rgba(234,147,40,0.08)', label: 'rgba(234,147,40,0.9)' },
  'K-06': { border: 'rgba(52,168,83,0.8)', background: 'rgba(52,168,83,0.08)', label: 'rgba(52,168,83,0.9)' },
  'K-11': { border: 'rgba(66,133,244,0.8)', background: 'rgba(66,133,244,0.08)', label: 'rgba(66,133,244,0.9)' },
  'K-12': { border: 'rgba(155,89,182,0.8)', background: 'rgba(155,89,182,0.08)', label: 'rgba(155,89,182,0.9)' },
  'K-13': { border: 'rgba(26,188,156,0.8)', background: 'rgba(26,188,156,0.08)', label: 'rgba(26,188,156,0.9)' },
  'K-16': { border: 'rgba(39,174,96,0.8)', background: 'rgba(39,174,96,0.08)', label: 'rgba(39,174,96,0.9)' },
  'K-18': { border: 'rgba(241,196,15,0.8)', background: 'rgba(241,196,15,0.08)', label: 'rgba(241,196,15,0.9)' },
  'K-20': { border: 'rgba(231,76,60,0.8)', background: 'rgba(231,76,60,0.08)', label: 'rgba(231,76,60,0.9)' },
  'K-23': { border: 'rgba(52,73,94,0.8)', background: 'rgba(52,73,94,0.08)', label: 'rgba(52,73,94,0.9)' },
  'K-24': { border: 'rgba(22,160,133,0.8)', background: 'rgba(22,160,133,0.08)', label: 'rgba(22,160,133,0.9)' },
  'K-30': { border: 'rgba(243,156,18,0.8)', background: 'rgba(243,156,18,0.08)', label: 'rgba(243,156,18,0.9)' },
  'K-34': { border: 'rgba(142,68,173,0.8)', background: 'rgba(142,68,173,0.08)', label: 'rgba(142,68,173,0.9)' },
  'K-51': { border: 'rgba(52,152,219,0.8)', background: 'rgba(52,152,219,0.08)', label: 'rgba(52,152,219,0.9)' },
  'K-53': { border: 'rgba(241,90,36,0.8)', background: 'rgba(241,90,36,0.08)', label: 'rgba(241,90,36,0.9)' },
  'K-55': { border: 'rgba(192,57,43,0.8)', background: 'rgba(192,57,43,0.08)', label: 'rgba(192,57,43,0.9)' },
  'K-58': { border: 'rgba(127,140,141,0.8)', background: 'rgba(127,140,141,0.08)', label: 'rgba(127,140,141,0.9)' },
  'K-59': { border: 'rgba(211,84,0,0.8)', background: 'rgba(211,84,0,0.08)', label: 'rgba(211,84,0,0.9)' },
  'K-60': { border: 'rgba(41,128,185,0.8)', background: 'rgba(41,128,185,0.08)', label: 'rgba(41,128,185,0.9)' },
  'K-61': { border: 'rgba(142,68,173,0.8)', background: 'rgba(142,68,173,0.08)', label: 'rgba(142,68,173,0.9)' },
};
const FALLBACK_COLOR = {
  border: 'rgba(149,165,166,0.8)',
  background: 'rgba(149,165,166,0.08)',
  label: 'rgba(149,165,166,0.9)',
};

interface HighlightRecord {
  element: HTMLElement;
  box: HTMLDivElement;
}

let trackedHighlights: HighlightRecord[] = [];
let scrollListenerAttached = false;

function getRuleColor(ruleId: string): { border: string; background: string; label: string } {
  return RULE_COLORS[ruleId] ?? FALLBACK_COLOR;
}

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
