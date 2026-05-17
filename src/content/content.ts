// This file bridges popup messages to the analysis engine running inside the content script.
import { runDarkScopeAnalysis } from '../engine/runDarkScopeAnalysis';
import { focusFirstHighlight, setOverlayEnabled } from '../engine/overlayRenderer';
import { RuleResult } from '../engine/types';

interface ScanMessage {
  type: 'scan';
  audienceMode?: 'user' | 'designer';
}

interface OverlayToggleMessage {
  type: 'setOverlayEnabled';
  enabled: boolean;
}

interface FocusOverlayMessage {
  type: 'focusOverlay';
  ruleId: string;
}

interface PingMessage {
  type: 'ping';
}

type ContentMessage = ScanMessage | OverlayToggleMessage | FocusOverlayMessage | PingMessage;

let lastResults: RuleResult[] = [];

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const typedMessage = message as ContentMessage;

  if (typedMessage?.type === 'scan') {
    void (async () => {
      const audienceMode = typedMessage.audienceMode === 'designer' ? 'designer' : 'user';
      const results = await runDarkScopeAnalysis(audienceMode);
      lastResults = results;
      sendResponse({ results, overlayEnabled: true });
    })();

    return true;
  }

  if (typedMessage?.type === 'setOverlayEnabled') {
    setOverlayEnabled(typedMessage.enabled, lastResults);
    sendResponse({ ok: true });
    return true;
  }

  if (typedMessage?.type === 'focusOverlay') {
    const hasHighlights = document.getElementById('__darkscope_overlay') !== null;

    if (!hasHighlights) {
      setOverlayEnabled(true, lastResults);
    }

    sendResponse({ ok: focusFirstHighlight(typedMessage.ruleId) });
    return true;
  }

  if (typedMessage?.type === 'ping') {
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
