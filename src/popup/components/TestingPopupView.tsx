import { RuleResult } from '@/engine/types';
import { PopupStatusTone } from '../types';

interface TestingPopupViewProps {
  apiKey: string;
  isSavingKey: boolean;
  isScanning: boolean;
  overlayEnabled: boolean;
  results: RuleResult[];
  statusMessage: string;
  statusTone: PopupStatusTone;
  onApiKeyChange: (value: string) => void;
  onSaveApiKey: () => void;
  onScan: () => void;
  onToggleOverlay: () => void;
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

export function TestingPopupView({
  apiKey,
  isSavingKey,
  isScanning,
  overlayEnabled,
  results,
  statusMessage,
  statusTone,
  onApiKeyChange,
  onSaveApiKey,
  onScan,
  onToggleOverlay
}: TestingPopupViewProps) {
  const detectedCount = results.filter((result) => result.detected).length;

  return (
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
          onChange={(event) => onApiKeyChange(event.target.value)}
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
          onClick={onSaveApiKey}
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
          onClick={onScan}
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
          onClick={onToggleOverlay}
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

        {statusTone === 'error' ? (
          <div
            style={{
              padding: '8px 10px',
              borderRadius: '6px',
              background: '#f8fafc',
              border: `1px solid ${toneColor(statusTone)}`,
              color: toneColor(statusTone),
              fontSize: '12px'
            }}
          >
            {statusMessage}
          </div>
        ) : null}
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
          <p style={{ margin: 0, fontSize: '12px', color: '#64748b' }}>No analysis yet.</p>
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
  );
}
