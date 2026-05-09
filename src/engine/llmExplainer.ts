// This file enriches detected rule results with short explanation and recommendation text from the background LLM proxy.
import { LlmProxyRequest, LlmProxyResponse, RuleResult } from './types';

interface ExplanationPayload {
  explanation?: string;
  recommendation?: string;
}

function stripMarkdownFences(value: string): string {
  return value.replace(/```json|```/gi, '').trim();
}

function requestLlm(prompt: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const message: LlmProxyRequest = {
      type: 'llm_request',
      payload: {
        prompt
      }
    };

    chrome.runtime.sendMessage(message, (response: LlmProxyResponse | undefined) => {
      if (chrome.runtime.lastError !== undefined) {
        reject(new Error(chrome.runtime.lastError.message));
        return;
      }

      if (response === undefined) {
        reject(new Error('empty_response'));
        return;
      }

      if ('error' in response) {
        reject(new Error(response.error));
        return;
      }

      resolve(response.text);
    });
  });
}

function buildPrompt(result: RuleResult): string {
  const evidenceLines = result.evidence.slice(0, 3).map((item, index) => {
    const text = item.text.replace(/\s+/g, ' ').trim().slice(0, 400);
    return `${index + 1}. selector=${item.selector}; reason=${item.reason}; text=${text}`;
  });

  return [
    'You explain a detected dark pattern to an end user.',
    'Return JSON only in this exact shape: {"explanation":"...","recommendation":"..."}',
    `ruleId: ${result.ruleId}`,
    `probability: ${Math.round(result.probability * 100)}%`,
    `impact: ${result.impact}`,
    'evidence:',
    ...evidenceLines
  ].join('\n');
}

async function enrichResult(result: RuleResult): Promise<RuleResult> {
  try {
    const raw = await requestLlm(buildPrompt(result));
    const parsed = JSON.parse(stripMarkdownFences(raw)) as ExplanationPayload;

    if (typeof parsed.explanation !== 'string' || typeof parsed.recommendation !== 'string') {
      return result;
    }

    return {
      ...result,
      explanation: parsed.explanation,
      recommendation: parsed.recommendation
    };
  } catch {
    return result;
  }
}

export async function enrichWithLLM(results: RuleResult[]): Promise<RuleResult[]> {
  return Promise.all(
    results.map((result) => {
      if (!result.detected || result.evidence.length === 0) {
        return Promise.resolve(result);
      }

      return enrichResult(result);
    })
  );
}
