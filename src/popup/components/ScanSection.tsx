import { useState } from 'react';
import { Button } from '@/components/ui/button';

export default function ScanSection() {
  const [isScanning, setIsScanning] = useState(false);
  const [results, setResults] = useState<any[]>([]);

  const handleScan = async () => {
    setIsScanning(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab.id || !tab.url) {
        alert('No active tab found.');
        return;
      }

      if (!tab.url.startsWith('http://') && !tab.url.startsWith('https://')) {
        alert('Please navigate to a webpage (http/https) to scan for dark patterns.');
        return;
      }

      const response = await chrome.tabs.sendMessage(tab.id, { action: 'scan' });
      setResults(response.darkPatterns || []);
    } catch (error) {
      console.error('Scan failed:', error);
      alert('Scan failed. The content script may not be loaded on this page. Try refreshing the page.');
    } finally {
      setIsScanning(false);
    }
  };

  return (
    <div className="mb-5">
      <Button onClick={handleScan} disabled={isScanning}>
        {isScanning ? 'Scanning...' : 'Run Scan'}
      </Button>
      {results.length > 0 && (
        <div className="mt-4">
          <h3 className="text-sm font-semibold">Detected Patterns:</h3>
          <ul className="text-xs space-y-2">
            {results.map((pattern, index) => (
              <li key={index} className="border rounded p-2">
                <div className="font-medium">{pattern.type}</div>
                <div>{pattern.description}</div>
                {pattern.score && <div>Score: {pattern.score}</div>}
                {pattern.probability && <div>Probability: {(pattern.probability * 100).toFixed(1)}%</div>}
                {pattern.evidence && (
                  <div className="mt-1 text-xs text-gray-600">
                    Opt-in: "{pattern.evidence.optInText}" | Opt-out: "{pattern.evidence.optOutText}"
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}