// This file bridges popup messages to the analysis engine running inside the content script.
import { runDarkScopeAnalysis } from '../engine/runDarkScopeAnalysis';
import { setOverlayEnabled } from '../engine/overlayRenderer';
import { RuleResult } from '../engine/types';

interface ScanMessage {
  type: 'scan';
}

interface OverlayToggleMessage {
  type: 'setOverlayEnabled';
  enabled: boolean;
}

interface PingMessage {
  type: 'ping';
}

type ContentMessage = ScanMessage | OverlayToggleMessage | PingMessage;

let lastResults: RuleResult[] = [];

chrome.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const typedMessage = message as ContentMessage;

  if (typedMessage?.type === 'scan') {
    void (async () => {
      const results = await runDarkScopeAnalysis();
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

  if (typedMessage?.type === 'ping') {
    sendResponse({ ok: true });
    return true;
  }

  return false;
});
