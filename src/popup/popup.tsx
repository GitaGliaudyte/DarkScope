import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { PopupHome } from '@/popup/components/PopupHome';
import { PopupInfoScreen } from '@/popup/components/PopupInfoScreen';
import { PopupResults } from '@/popup/components/PopupResults';
import { PopupResultsDetailsScreen } from '@/popup/components/PopupResultsDetailsScreen';
import { PopupPrincipleScoresScreen } from '@/popup/components/PopupPrincipleScoresScreen';
import { PopupSettingsScreen } from '@/popup/components/PopupSettingsScreen';
import { RuleResult } from '@/engine/types';
import { AudienceMode, PopupScreen, PopupStatusTone, PopupSurfaceMode } from './types';
import './styles.css';

document.body.dataset.surface = 'popup';

interface ScanResponse {
  results?: RuleResult[];
  overlayEnabled?: boolean;
}

interface PingResponse {
  ok?: boolean;
}

interface OverlayFocusResponse {
  ok?: boolean;
}

interface ActiveTabInfo {
  id: number;
  url: string;
}

interface PopupSettings {
  audienceMode: AudienceMode;
  surfaceMode: PopupSurfaceMode;
}

const POPUP_SETTINGS_KEYS = ['popup_audience_mode', 'popup_surface_mode'];

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

function loadPopupSettings(): Promise<PopupSettings> {
  return new Promise((resolve) => {
    chrome.storage.local.get(POPUP_SETTINGS_KEYS, (items) => {
      const storedAudienceMode = items.popup_audience_mode;
      const storedSurfaceMode = items.popup_surface_mode;

      resolve({
        audienceMode: storedAudienceMode === 'designer' ? 'designer' : 'user',
        surfaceMode: storedSurfaceMode === 'user' ? 'user' : 'testing'
      });
    });
  });
}

function savePopupSetting(key: 'popup_audience_mode' | 'popup_surface_mode', value: AudienceMode | PopupSurfaceMode): Promise<void> {
  return new Promise((resolve, reject) => {
    chrome.storage.local.set({ [key]: value }, () => {
      if (chrome.runtime.lastError !== undefined) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      resolve();
    });
  });
}

function App(): React.JSX.Element {
  const [results, setResults] = useState<RuleResult[]>([]);
  const [overlayEnabled, setOverlayEnabledState] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [statusMessage, setStatusMessage] = useState('Ready to scan the active tab.');
  const [statusTone, setStatusTone] = useState<PopupStatusTone>('neutral');
  const [audienceMode, setAudienceMode] = useState<AudienceMode>('user');
  const [popupScreen, setPopupScreen] = useState<PopupScreen>('home');

  useEffect(() => {
    void loadPopupSettings().then((settings) => {
      setAudienceMode(settings.audienceMode);
    });
  }, []);

  const handleScan = async (): Promise<void> => {
    setIsScanning(true);
    setStatusTone('neutral');
    setStatusMessage('Running analysis...');

    try {
      const response = await sendMessageToActiveTab<ScanResponse>({
        type: 'scan',
        audienceMode
      });
      const nextResults = Array.isArray(response.results) ? response.results : [];

      setResults(nextResults);
      setOverlayEnabledState(response.overlayEnabled === true);
      setStatusTone('success');
      setStatusMessage(`Analysis complete. ${nextResults.filter((result) => result.detected).length} issues detected.`);
      setPopupScreen('results');
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(getPopupErrorMessage(error));
    } finally {
      setIsScanning(false);
    }
  };

  const handleSetOverlayEnabled = async (nextValue: boolean, successMessage?: string): Promise<void> => {
    try {
      await sendMessageToActiveTab<{ ok?: boolean }>({
        type: 'setOverlayEnabled',
        enabled: nextValue
      });

      setOverlayEnabledState(nextValue);
      setStatusTone('neutral');
      setStatusMessage(successMessage ?? (nextValue ? 'Overlay enabled.' : 'Overlay disabled.'));
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to update overlay.');
    }
  };

  const handleFocusIssue = async (ruleId: string): Promise<void> => {
    try {
      const response = await sendMessageToActiveTab<OverlayFocusResponse>({
        type: 'focusOverlay',
        ruleId
      });

      if (response.ok !== true) {
        setStatusTone('error');
        setStatusMessage(`Unable to locate a visible ${ruleId} overlay on the page.`);
        return;
      }

      setOverlayEnabledState(true);
      setStatusTone('neutral');
      setStatusMessage(`Focused the first ${ruleId} occurrence on the page.`);
    } catch (error) {
      setStatusTone('error');
      setStatusMessage(error instanceof Error ? error.message : 'Failed to focus the selected issue.');
    }
  };

  const handleAudienceModeChange = (nextMode: AudienceMode): void => {
    setAudienceMode(nextMode);
    void savePopupSetting('popup_audience_mode', nextMode);
  };

  const handleStartOver = (): void => {
    if (overlayEnabled) {
      void handleSetOverlayEnabled(false, 'Overlay hidden.');
    }

    setResults([]);
    setOverlayEnabledState(false);
    setPopupScreen('home');
    setStatusTone('neutral');
    setStatusMessage('Ready to scan the active tab.');
  };

  return (
    <section className="space-y-4">
      {popupScreen === 'results' && results.length > 0 ? (
        <PopupResults
          audienceMode={audienceMode}
          overlayEnabled={overlayEnabled}
          results={results}
          onLearnMore={() => setPopupScreen('results_details')}
          onToggleOverlay={() =>
            void handleSetOverlayEnabled(
              !overlayEnabled,
              overlayEnabled ? 'Overlay hidden.' : 'Overlay shown.'
            )
          }
          onStartOver={handleStartOver}
        />
      ) : popupScreen === 'results_details' && results.length > 0 ? (
        <PopupResultsDetailsScreen
          audienceMode={audienceMode}
          results={results}
          onBack={() => setPopupScreen('results')}
          onOpenPrincipleScores={() => setPopupScreen('principle_scores')}
          onFocusIssue={(ruleId) => void handleFocusIssue(ruleId)}
        />
      ) : popupScreen === 'principle_scores' && results.length > 0 ? (
        <PopupPrincipleScoresScreen
          results={results}
          onBack={() => setPopupScreen('results_details')}
        />
      ) : popupScreen === 'settings' ? (
        <PopupSettingsScreen
          audienceMode={audienceMode}
          onAudienceModeChange={handleAudienceModeChange}
          onBack={() => setPopupScreen('home')}
        />
      ) : popupScreen === 'info' ? (
        <PopupInfoScreen onBack={() => setPopupScreen('home')} />
      ) : (
        <PopupHome
          audienceMode={audienceMode}
          isScanning={isScanning}
          statusMessage={statusMessage}
          statusTone={statusTone}
          onOpenSettings={() => setPopupScreen('settings')}
          onOpenInfo={() => setPopupScreen('info')}
          onRunAnalysis={() => void handleScan()}
        />
      )}
    </section>
  );
}

const container = document.getElementById('root');

if (container !== null) {
  createRoot(container).render(<App />);
}
