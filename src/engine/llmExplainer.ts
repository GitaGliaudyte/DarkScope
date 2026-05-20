import { GEMINI_SECRETS_FILE_PATH } from '../config/llm';
import { getOrderedPrincipleViolations, getRuleDisplayName } from '../rules/kQuestions';
import { LlmProxyRequest, LlmProxyResponse, RuleResult } from './types';

type ExplainerAudienceMode = 'user' | 'designer';
const EXPLAINER_BATCH_SIZE = 6;

interface ExplanationItemPayload {
  ruleId?: string;
  explanation?: string;
  recommendation?: string;
}

interface ExplanationResponsePayload {
  items?: ExplanationItemPayload[];
}

function stripMarkdownFences(value: string): string {
  return value.replace(/```json|```/gi, '').trim();
}

function extractJsonObject(value: string): string | null {
  const normalized = stripMarkdownFences(value);
  const start = normalized.indexOf('{');

  if (start === -1) {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaping = false;

  for (let index = start; index < normalized.length; index += 1) {
    const character = normalized[index];

    if (escaping) {
      escaping = false;
      continue;
    }

    if (character === '\\') {
      escaping = true;
      continue;
    }

    if (character === '"') {
      inString = !inString;
      continue;
    }

    if (inString) {
      continue;
    }

    if (character === '{') {
      depth += 1;
      continue;
    }

    if (character === '}') {
      depth -= 1;

      if (depth === 0) {
        return normalized.slice(start, index + 1);
      }
    }
  }

  return null;
}

function repairJsonLikeResponse(value: string): string {
  return value
    .replace(/^[^{[]*/, '')
    .replace(/([{,]\s*)([A-Za-z_][A-Za-z0-9_]*)(\s*:)/g, '$1"$2"$3')
    .replace(/,\s*([}\]])/g, '$1');
}

function chunkResults(results: RuleResult[], size: number): RuleResult[][] {
  const chunks: RuleResult[][] = [];

  for (let index = 0; index < results.length; index += size) {
    chunks.push(results.slice(index, index + size));
  }

  return chunks;
}

function requestLlm(prompt: string, responseSchema: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const message: LlmProxyRequest = {
      type: 'llm_request',
      payload: {
        prompt,
        maxTokens: 1200,
        responseMimeType: 'application/json',
        responseSchema
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

function buildEvidenceBlock(result: RuleResult): string {
  if (result.evidence.length === 0) {
    return 'No direct evidence captured.';
  }

  return result.evidence
    .slice(0, 3)
    .map((item, index) => {
      const text = item.text.replace(/\s+/g, ' ').trim().slice(0, 220);
      const reason = item.reason.replace(/\s+/g, ' ').trim().slice(0, 220);
      return `${index + 1}. reason=${reason}; text=${text}; selector=${item.selector}`;
    })
    .join('\n');
}

function buildPrompt(results: RuleResult[], audienceMode: ExplainerAudienceMode): string {
  const audienceInstruction =
    audienceMode === 'designer'
      ? 'Phrase the explanation so it is useful for a designer reviewing the interface.'
      : 'Phrase the explanation for a general user and focus on the concrete effect this issue can have on that person, such as pressure, confusion, accidental spending, weaker consent, privacy loss, or making refusal harder.';

  const ruleBlocks = results.map((result) => {
    const principles = getOrderedPrincipleViolations(result.ruleId);

    return [
      `ruleId: ${result.ruleId}`,
      `pattern: ${getRuleDisplayName(result.ruleId)}`,
      `violated_principles: ${principles.length > 0 ? principles.join(', ') : 'none'}`,
      `probability: ${Math.round(result.probability * 100)}%`,
      `impact: ${result.impact}`,
      `confidence: ${result.confidence}`,
      'evidence:',
      buildEvidenceBlock(result)
    ].join('\n');
  });

  return [
    'You explain detected dark patterns for a browser extension.',
    audienceInstruction,
    audienceMode === 'user'
      ? 'For user-mode explanations, describe the likely impact on the user rather than the implementation details of the interface.'
      : 'For designer-mode explanations, connect the detected behavior to the interface choice that likely caused it.',
    'For each detected pattern, write one sentence explaining the issue and one sentence suggesting a practical fix for the interface team.',
    'Keep each explanation concise, concrete, and limited to one sentence.',
    'Keep each recommendation concise, concrete, and limited to one sentence.',
    audienceMode === 'user'
      ? 'Avoid design jargon and abstract descriptions unless they are tied to a clear user consequence.'
      : 'Avoid vague language and name the problematic interface behavior directly.',
    'Do not mention probability, confidence, evidence counts, or selectors in the output.',
    'Return JSON only in this exact shape: {"items":[{"ruleId":"KO-1","explanation":"...","recommendation":"..."}]}',
    'Detected patterns:',
    ...ruleBlocks.flatMap((block, index) => [`[${index + 1}]`, block])
  ].join('\n');
}

function buildResponseSchema(): Record<string, unknown> {
  return {
    type: 'object',
    properties: {
      items: {
        type: 'array',
        items: {
          type: 'object',
          properties: {
            ruleId: { type: 'string' },
            explanation: { type: 'string' },
            recommendation: { type: 'string' }
          },
          required: ['ruleId', 'explanation', 'recommendation']
        }
      }
    },
    required: ['items']
  };
}

function isValidExplanationItem(value: ExplanationItemPayload): value is Required<ExplanationItemPayload> {
  return (
    typeof value.ruleId === 'string' &&
    typeof value.explanation === 'string' &&
    typeof value.recommendation === 'string'
  );
}

function parseExplanationResponse(raw: string): ExplanationResponsePayload {
  const candidate = extractJsonObject(raw) ?? stripMarkdownFences(raw);
  const parseCandidates = Array.from(new Set([candidate, repairJsonLikeResponse(candidate)]));
  let lastError: Error | null = null;

  for (const parseCandidate of parseCandidates) {
    try {
      return JSON.parse(parseCandidate) as ExplanationResponsePayload;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error('json_parse_error');
    }
  }

  throw lastError ?? new Error('json_parse_error');
}

function buildFallbackCopy(errorMessage: string): Pick<RuleResult, 'explanation' | 'recommendation'> {
  if (errorMessage === 'no_api_key') {
    return {
      explanation: `Explanation unavailable because the running extension build has no Gemini API key. If you just edited ${GEMINI_SECRETS_FILE_PATH}, rebuild the extension and reload it in Chrome before scanning again.`,
      recommendation:
        'Suggestion unavailable for the same reason. Rebuild the extension, reload it in Chrome, and rerun the scan.'
    };
  }

  if (errorMessage === 'empty_response') {
    return {
      explanation: 'Explanation unavailable because the LLM returned an empty response for this analysis run.',
      recommendation: 'Suggestion unavailable because the LLM returned an empty response. Retry the scan after reloading the extension.'
    };
  }

  if (/json|unterminated|string|unexpected end|expected/i.test(errorMessage)) {
    return {
      explanation: 'Explanation unavailable because the LLM returned an invalid response for this analysis run.',
      recommendation: 'Suggestion unavailable because the LLM returned an invalid response. Retry the scan after reloading the extension.'
    };
  }

  return {
    explanation: `Explanation unavailable because the LLM request failed: ${errorMessage}.`,
    recommendation: `Suggestion unavailable because the LLM request failed: ${errorMessage}.`
  };
}

function applyFallbackSummaries(results: RuleResult[], fallback: Pick<RuleResult, 'explanation' | 'recommendation'>): RuleResult[] {
  return results.map((result) => {
    if (!result.detected) {
      return result;
    }

    return {
      ...result,
      explanation: fallback.explanation,
      recommendation: fallback.recommendation
    };
  });
}

async function enrichDetectedBatch(
  detectedResults: RuleResult[],
  audienceMode: ExplainerAudienceMode
): Promise<Map<string, Required<ExplanationItemPayload>>> {
  const raw = await requestLlm(buildPrompt(detectedResults, audienceMode), buildResponseSchema());
  const parsed = parseExplanationResponse(raw);
  const items = Array.isArray(parsed.items) ? parsed.items.filter(isValidExplanationItem) : [];
  return new Map(items.map((item) => [item.ruleId, item]));
}

export async function enrichWithLLM(results: RuleResult[], audienceMode: ExplainerAudienceMode): Promise<RuleResult[]> {
  const detectedResults = results.filter((result) => result.detected);

  if (detectedResults.length === 0) {
    return results;
  }

  try {
    const batchMaps = await Promise.all(
      chunkResults(detectedResults, EXPLAINER_BATCH_SIZE).map((batch) => enrichDetectedBatch(batch, audienceMode))
    );
    const itemsByRuleId = new Map(batchMaps.flatMap((batchMap) => Array.from(batchMap.entries())));
    const missingItemFallback = {
      explanation: 'Explanation unavailable because the LLM response did not include this detected pattern.',
      recommendation: 'Suggestion unavailable because the LLM response did not include this detected pattern.'
    };

    return results.map((result) => {
      if (!result.detected) {
        return result;
      }

      const item = itemsByRuleId.get(result.ruleId);

      return {
        ...result,
        explanation: item?.explanation.trim() || missingItemFallback.explanation,
        recommendation: item?.recommendation.trim() || missingItemFallback.recommendation
      };
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown_error';
    return applyFallbackSummaries(results, buildFallbackCopy(message));
  }
}
