// Content script for DarkScope - Dark Pattern Detector

import { Q1_asymmetricEffort } from '../questions/Q1_asymmetricEffort';
import { Q2_fakeUrgency } from '../questions/Q2_fakeUrgency';
import { evaluateQuestion } from '../engine/evaluateQuestion';

console.log('DarkScope content script loaded');

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  console.log('Received message:', request);
  if (request.action === 'scan') {
    try {
      // Perform dark pattern detection
      const darkPatterns = detectDarkPatterns();
      console.log('Sending response:', { darkPatterns });
      sendResponse({ darkPatterns });
    } catch (error) {
      console.error('Error in detectDarkPatterns:', error);
      sendResponse({ darkPatterns: [], error: (error as Error).message });
    }
  }
  return true; // Keep the message channel open for async response
});

function detectDarkPatterns() {
  const patterns = [];

  // Run Q1: Asymmetric Effort
  const q1Result = Q1_asymmetricEffort();
  if (q1Result) {
    const evaluation = evaluateQuestion({
      probability: q1Result.probability,
      threshold: 0.15,
      score: 2
    });

    if (evaluation.triggered) {
      patterns.push({
        type: 'asymmetric-effort',
        score: evaluation.score,
        probability: evaluation.probability,
        evidence: q1Result.evidence,
        elements: q1Result.elements,
        description: 'Opt-in is easier/more visible than opt-out'
      });
    }
  }

  // Run Q2: Fake Urgency
  const q2Result = Q2_fakeUrgency();
  if (q2Result) {
    const evaluation = evaluateQuestion({
      probability: q2Result.probability,
      threshold: 0.3,
      score: 1
    });

    if (evaluation.triggered) {
      patterns.push({
        type: 'fake-urgency',
        score: evaluation.score,
        probability: evaluation.probability,
        evidence: q2Result.evidence,
        elements: q2Result.elements,
        description: 'Potential fake urgency elements detected'
      });
    }
  }

  return patterns;
}