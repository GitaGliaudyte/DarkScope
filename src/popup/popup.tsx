// This file renders a minimal popup UI that can save the API key, run analysis, and toggle overlays.
import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { RuleResult } from '../engine/types';

type PopupStatusTone = 'neutral' | 'success' | 'error';

interface ScanResponse {
  results?: RuleResult[];
  overlayEnabled?: boolean;
}

interface PingResponse {
  ok?: boolean;
}

interface ActiveTabInfo {
  id: number;
  url: string;
}

function isSupportedTabUrl(url: string): boolean {
  return /^https?:\/\//i.test(url);
}

function getActiveTab(): Promise<ActiveTabInfo> {
  return new Promise((resolve, reject) => {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (chrome.runtime.lastError !== undefined) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      const activeTab = tabs[0];
      const activeTabId = activeTab?.id;
      const activeTabUrl = activeTab?.url ?? '';

      if (activeTabId === undefined) {
        reject(new Error('No active tab available.'));
        return;
      }

      if (!isSupportedTabUrl(activeTabUrl)) {
        reject(new Error('This tab cannot be analyzed. Open a regular http or https page.'));
        return;
      }

      resolve({ id: activeTabId, url: activeTabUrl });
    });
  });
}

function sendTabMessage<TResponse>(tabId: number, message: unknown): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    chrome.tabs.sendMessage(tabId, message, (response: TResponse) => {
      if (chrome.runtime.lastError !== undefined) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve(response);
    });
  });
}

function executeContentScript(tabId: number): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.scripting.executeScript(
      {
        target: { tabId },
        files: ['content.js']
      },
      () => {
        if (chrome.runtime.lastError !== undefined) {
          reject(new Error(chrome.runtime.lastError.message));
          return;
        }

        resolve();
      }
    );
  });
}

async function ensureContentScriptReady(tabId: number): Promise<void> {
  try {
    await sendTabMessage<PingResponse>(tabId, { type: 'ping' });
    return;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to reach active tab.';
    const missingReceiver =
      message.includes('Receiving end does not exist') || message.includes('Could not establish connection');

    if (!missingReceiver) {
      throw new Error(message);
    }
  }

  await executeContentScript(tabId);
  await sendTabMessage<PingResponse>(tabId, { type: 'ping' });
}

async function sendMessageToActiveTab<TResponse>(message: unknown): Promise<TResponse> {
  const activeTab = await getActiveTab();
  await ensureContentScriptReady(activeTab.id);
  return sendTabMessage<TResponse>(activeTab.id, message);
}

function getPopupErrorMessage(error: unknown): string {
  if (!(error instanceof Error)) {
    return 'Scan failed. Chrome internal pages and unsupported tabs cannot be analyzed.';
  }

  if (
    error.message.includes('Cannot access') ||
    error.message.includes('The extensions gallery cannot be scripted') ||
    error.message.includes('cannot be analyzed')
  ) {
    return 'This tab cannot be analyzed. Open a regular website page and try again.';
  }

  if (error.message.includes('Receiving end does not exist') || error.message.includes('Could not establish connection')) {
    return 'The page is not ready yet. Refresh the tab once and run the scan again.';
  }

  return error.message;
}

function loadApiKey(): Promise<string> {
  return new Promise((resolve) => {
    chrome.storage.local.get(['gemini_api_key'], (items) => {
      resolve(typeof items.gemini_api_key === 'string' ? items.gemini_api_key : '');
    });
  });
}

function saveApiKey(value: string): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set(
      {
        gemini_api_key: value.trim()
      },
      () => {
      if (chrome.runtime.lastError !== undefined) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
      }
    );
  });
}

function toneColor(tone: PopupStatusTone): string {
  if (tone === 'success') {
    return '#166534';
  }

  if (tone === 'error') {
    return '#991b1b';
  }

  return '#334155';
}

function resultBorderColor(result: RuleResult): string {
  if (result.status === 'error') {
    return '#ef4444';
  }

  if (result.detected) {
    return '#dc2626';
  }

  if (result.status === 'not_applicable') {
    return '#94a3b8';
  }

  return '#16a34a';
}

function App(): React.JSX.Element {
  const [apiKey, setApiKey] = useState('');
  const [results, setResults] = useState<RuleResult[]>([]);
  const [overlayEnabled, setOverlayEnabledState] = useState(false);
  const [isSavingKey, setIsSavingKey] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to scan the active tab.');
  const [statusTone, setStatusTone] = useState<PopupStatusTone>('neutral');

  useEffect(() => {
    void loadApiKey().then((storedKey) => {
      setApiKey(storedKey);
    });
  }, []);

  const handleSaveApiKey = async (): Promise<void> => {
    setIsSavingKey(true);

    try {
      await saveApiKey(apiKey);
      setStatusTone('success');
      setStatusMessage(apiKey.trim().length > 0 ? 'Gemini API key saved.' : 'Gemini API key cleared.');
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to save API key.');
    } finally {
      setIsSavingKey(false);
    }
  };

  const handleScan = async (): Promise<void> => {
    setIsScanning(true);
    setStatusTone('neutral');
    setStatusMessage('Running analysis...');

    try {
      const response = await sendMessageToActiveTab<ScanResponse>({ type: 'scan' });
      const nextResults = Array.isArray(response.results) ? response.results : [];

      setResults(nextResults);
      setOverlayEnabledState(response.overlayEnabled === true);
      setStatusTone('success');
      setStatusMessage(`Analysis complete. ${nextResults.filter((result) => result.detected).length} issues detected.`);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(getPopupErrorMessage(error));
    } finally {
      setIsScanning(false);
    }
  };

  const handleOverlayToggle = async (): Promise<void> => {
    const nextValue = !overlayEnabled;

    try {
      await sendMessageToActiveTab<{ ok?: boolean }>({
        type: 'setOverlayEnabled',
        enabled: nextValue
      });

      setOverlayEnabledState(nextValue);
      setStatusTone('neutral');
      setStatusMessage(nextValue ? 'Overlay enabled.' : 'Overlay disabled.');
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update overlay.');
    }
  };

  const detectedCount = results.filter((result) => result.detected).length;

  return (
    <main
      style={{
        width: '360px',
        margin: 0,
        padding: '14px',
        boxSizing: 'border-box',
        fontFamily: 'system-ui, sans-serif',
        background: '#f8fafc',
        color: '#0f172a'
      }}
    >
      <section style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <header style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <img
            src={chrome.runtime.getURL('icons/crosshair.png')}
            alt=""
            aria-hidden="true"
            width={28}
            height={28}
            style={{
              display: 'block',
              flex: '0 0 auto'
            }}
          />
          <div>
            <h1 style={{ margin: 0, fontSize: '18px', fontWeight: 700 }}>DarkScope</h1>
          <p style={{ margin: '4px 0 0', fontSize: '12px', color: '#475569' }}>
            Scan the current page for dark pattern signals.
          </p>
          </div>
        </header>

        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: '#ffffff'
          }}
        >
          <label htmlFor="gemini-key" style={{ fontSize: '12px', fontWeight: 600 }}>
            Gemini API key
          </label>
          <input
            id="gemini-key"
            type="password"
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
            placeholder="Optional for LLM classification"
            style={{
              width: '100%',
              padding: '8px 10px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              boxSizing: 'border-box',
              fontSize: '12px'
            }}
          />
          <button
            type="button"
            onClick={() => void handleSaveApiKey()}
            disabled={isSavingKey}
            style={{
              padding: '8px 10px',
              border: 'none',
              borderRadius: '6px',
              background: '#1d4ed8',
              color: '#ffffff',
              cursor: isSavingKey ? 'default' : 'pointer',
              opacity: isSavingKey ? 0.7 : 1,
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {isSavingKey ? 'Saving...' : 'Save API key'}
          </button>
        </section>

        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: '#ffffff'
          }}
        >
          <button
            type="button"
            onClick={() => void handleScan()}
            disabled={isScanning}
            style={{
              padding: '10px 12px',
              border: 'none',
              borderRadius: '6px',
              background: '#111827',
              color: '#ffffff',
              cursor: isScanning ? 'default' : 'pointer',
              opacity: isScanning ? 0.7 : 1,
              fontSize: '13px',
              fontWeight: 700
            }}
          >
            {isScanning ? 'Scanning...' : 'Run analysis'}
          </button>

          <button
            type="button"
            onClick={() => void handleOverlayToggle()}
            disabled={results.length === 0}
            style={{
              padding: '9px 12px',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              background: overlayEnabled ? '#fee2e2' : '#f8fafc',
              color: '#0f172a',
              cursor: results.length === 0 ? 'default' : 'pointer',
              opacity: results.length === 0 ? 0.55 : 1,
              fontSize: '12px',
              fontWeight: 600
            }}
          >
            {overlayEnabled ? 'Hide overlay' : 'Show overlay'}
          </button>

          <div
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: `1px solid ${statusTone === 'neutral' ? '#e2e8f0' : toneColor(statusTone)}`,
              color: toneColor(statusTone),
              fontSize: '12px'
            }}
          >
            {statusMessage}
          </div>
        </section>

        <section
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            padding: '10px',
            border: '1px solid #cbd5e1',
            borderRadius: '8px',
            background: '#ffffff'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <strong style={{ fontSize: '13px' }}>Results</strong>
            <span style={{ fontSize: '12px', color: '#475569' }}>
              {detectedCount}/{results.length} detected
            </span>
          </div>

          {results.length === 0 ? (
            <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>
              No analysis yet.
            </p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '280px', overflowY: 'auto' }}>
              {results.map((result) => (
                <article
                  key={result.ruleId}
                  style={{
                    padding: '10px',
                    border: `1px solid ${resultBorderColor(result)}`,
                    borderRadius: '6px',
                    background: '#ffffff'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px' }}>
                    <strong style={{ fontSize: '12px' }}>{result.ruleId}</strong>
                    <span style={{ fontSize: '11px', color: '#475569', textTransform: 'capitalize' }}>
                      {result.status.replace('_', ' ')}
                    </span>
                  </div>
                  <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#334155' }}>
                    Confidence: {result.confidence} | Probability: {Math.round(result.probability * 100)}% | Evidence:{' '}
                    {result.evidence.length}
                  </p>
                  {result.explanation.length > 0 ? (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#0f172a' }}>{result.explanation}</p>
                  ) : null}
                  {result.recommendation.length > 0 ? (
                    <p style={{ margin: '6px 0 0', fontSize: '12px', color: '#475569' }}>{result.recommendation}</p>
                  ) : null}
                </article>
              ))}
            </div>
          )}
        </section>
      </section>
    </main>
  );
}

const container = document.getElementById('root');

if (container !== null) {
  createRoot(container).render(<App />);
}
