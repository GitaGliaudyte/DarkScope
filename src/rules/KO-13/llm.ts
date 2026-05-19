import { LlmProxyRequest, LlmProxyResponse, LlmProxySuccessResponse } from '../../engine/types';
import { LLM_MAX_TOKENS, LLM_THINKING_BUDGET, LLM_TIMEOUT_MS } from './constants';
import { FlaggedRegion, ParseAttemptResult, ParsedLlmResponse, TextSample } from './types';

export const RETRY_SAMPLE_LIMIT = 8;

export const K34_COMPACT_RETRY_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    d: {
      type: 'STRING'
    },
    f: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          s: {
            type: 'INTEGER'
          },
          l: {
            type: 'STRING'
          },
          v: {
            type: 'STRING',
            enum: ['high', 'medium', 'low']
          }
        },
        required: ['s', 'l', 'v'], // s - sample number, l - detected language, v - severity
        propertyOrdering: ['s', 'l', 'v']
      }
    },
    c: {
      type: 'STRING',
      enum: ['high', 'medium', 'low']
    }
  },
  required: ['d', 'f', 'c'], // d - dominant language, f - flagged regions, c - confidence
  propertyOrdering: ['d', 'f', 'c']
};

const K34_RESPONSE_SCHEMA: Record<string, unknown> = {
  type: 'OBJECT',
  properties: {
    dominantLanguage: {
      type: 'STRING'
    },
    flaggedRegions: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          sampleNumber: {
            type: 'INTEGER'
          },
          detectedLanguage: {
            type: 'STRING'
          },
          severity: {
            type: 'STRING',
            enum: ['high', 'medium', 'low']
          }
        },
        required: ['sampleNumber', 'detectedLanguage', 'severity'],
        propertyOrdering: ['sampleNumber', 'detectedLanguage', 'severity']
      }
    },
    confidence: {
      type: 'STRING',
      enum: ['high', 'medium', 'low']
    }
  },
  required: ['dominantLanguage', 'flaggedRegions', 'confidence'],
  propertyOrdering: ['dominantLanguage', 'flaggedRegions', 'confidence']
};

const SYSTEM_PROMPT = `You are a language detection assistant for a browser extension that detects dark patterns.
You will receive a list of text samples from a webpage, each tagged with a region label.
Your task is to detect whether any important region contains text in a different language
than the dominant language of the page.
Rules:

Identify the dominant language of the page (the language used in most regions)
Flag any region where the language clearly differs from the dominant language
Focus on IMPORTANT regions: legal, terms, pricing, fees, error messages, consent banners
Do NOT flag: proper nouns, brand names, technical terms, URLs, single words that are
internationally common (e.g. "OK", "email", "PDF")
Do NOT flag navigation or buttons if they contain only 1-2 words that could be universal
A region is only flagged if it contains a full sentence or meaningful phrase in a
different language

Respond ONLY with a valid JSON object, no markdown, no explanation:
{
"dominantLanguage": "<language name in English>",
"flaggedRegions": [
{
"sampleNumber": <the matching sample number from the input list>,
"detectedLanguage": "<language name in English>",
"severity": "high" | "medium" | "low"
}
],
"confidence": "high" | "medium" | "low"
}
Severity guide:

high: legal, terms, pricing, fees, consent, error messages in wrong language
medium: product description, form labels in wrong language
low: navigation, buttons, headings in wrong language

If no language mismatch is found, return flaggedRegions as an empty array.`;

function stripMarkdownFences(value: string): string {
  return value.replace(/```json/gi, '').replace(/```/g, '').trim();
}

function normalizeEnumValue(value: string): string {
  return value.trim().toLowerCase();
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

function parseSampleNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isInteger(value)) {
    return value;
  }

  if (typeof value === 'string' && /^\d+$/.test(value.trim())) {
    return Number.parseInt(value.trim(), 10);
  }

  return null;
}

function normalizeFinishReason(reason: string | undefined): string | null {
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return null;
  }

  return reason.trim().toUpperCase();
}

function requestLlm(
  prompt: string,
  responseSchema: Record<string, unknown> = K34_RESPONSE_SCHEMA,
  thinkingBudget = LLM_THINKING_BUDGET
): Promise<LlmProxySuccessResponse> {
  return new Promise((resolve, reject) => {
    const message: LlmProxyRequest = {
      type: 'llm_request',
      payload: {
        prompt,
        maxTokens: LLM_MAX_TOKENS,
        responseMimeType: 'application/json',
        responseSchema,
        thinkingBudget
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

      resolve(response);
    });
  });
}

function mapStructuredFlaggedRegions(
  flaggedRegions: Array<
    Partial<FlaggedRegion> & {
      sampleNumber?: number | string;
    }
  >,
  samples: TextSample[]
): { flaggedRegions: FlaggedRegion[]; reason: string | null } {
  const normalizedFlaggedRegions: FlaggedRegion[] = [];

  for (const item of flaggedRegions) {
    const normalizedSeverity = typeof item.severity === 'string' ? normalizeEnumValue(item.severity) : item.severity;

    if (
      typeof item.detectedLanguage !== 'string' ||
      (normalizedSeverity !== 'high' && normalizedSeverity !== 'medium' && normalizedSeverity !== 'low')
    ) {
      return { flaggedRegions: [], reason: 'invalid_flagged_region_entry' };
    }

    const sampleNumber = parseSampleNumber(item.sampleNumber);

    if (sampleNumber !== null) {
      const sample = samples[sampleNumber - 1];

      if (sample === undefined) {
        return { flaggedRegions: [], reason: 'invalid_sample_number_reference' };
      }

      normalizedFlaggedRegions.push({
        sampleNumber,
        region: sample.region,
        text: sample.text,
        detectedLanguage: item.detectedLanguage,
        severity: normalizedSeverity
      });
      continue;
    }

    if (typeof item.region !== 'string' || typeof item.text !== 'string') {
      return { flaggedRegions: [], reason: 'invalid_flagged_region_entry' };
    }

    normalizedFlaggedRegions.push({
      region: item.region,
      text: item.text,
      detectedLanguage: item.detectedLanguage,
      severity: normalizedSeverity
    });
  }

  return { flaggedRegions: normalizedFlaggedRegions, reason: null };
}

export function previewText(value: string, maxLength = 240): string {
  return value.replace(/\s+/g, ' ').trim().slice(0, maxLength);
}

export function buildLLMPrompt(samples: TextSample[]): string {
  const userMessage = [
    'Here are the text samples from the page:',
    samples.map((sample, index) => `[${index + 1}] Region: ${sample.region}\nText: ${JSON.stringify(sample.text)}`).join('\n\n'),
    '',
    'If you flag a sample, refer to it by its numeric sampleNumber from the list above.',
    'Do not repeat or quote sample text in the JSON response.',
    'Return valid JSON only.'
  ].join('\n');

  return [SYSTEM_PROMPT, '', userMessage].join('\n');
}

export function buildRetryPrompt(samples: TextSample[]): string {
  const userMessage = [
    'Return a single-line valid JSON object only.',
    'Use a compact JSON shape to minimize output length.',
    'Use this exact shape:',
    '{"d":"English","f":[{"s":3,"l":"French","v":"high"}],"c":"low"}',
    'Field meanings: d=dominantLanguage, f=flaggedRegions, s=sampleNumber, l=detectedLanguage, v=severity, c=confidence.',
    'Do not stop after the first field. Return the full object only once.',
    '',
    'Here are the text samples from the page:',
    samples.map((sample, index) => `[${index + 1}] Region: ${sample.region}\nText: ${JSON.stringify(sample.text)}`).join('\n\n')
  ].join('\n');

  return [SYSTEM_PROMPT, '', userMessage].join('\n');
}

export function describeAttemptReason(reason: string, response: LlmProxySuccessResponse): string {
  const finishReason = normalizeFinishReason(response.finishReason);

  if (finishReason === null || finishReason === 'STOP') {
    return reason;
  }

  return `${reason}; finish_reason:${finishReason}`;
}

export async function requestLlmWithTimeout(
  prompt: string,
  responseSchema: Record<string, unknown> = K34_RESPONSE_SCHEMA,
  thinkingBudget = LLM_THINKING_BUDGET
): Promise<LlmProxySuccessResponse | 'timeout'> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    const timeoutPromise = new Promise<'timeout'>((resolve) => {
      timeoutId = setTimeout(() => {
        resolve('timeout');
      }, LLM_TIMEOUT_MS);
    });

    return await Promise.race([requestLlm(prompt, responseSchema, thinkingBudget), timeoutPromise]);
  } finally {
    if (timeoutId !== undefined) {
      clearTimeout(timeoutId);
    }
  }
}

export function tryParseCompactRetryResponse(rawResponse: string, samples: TextSample[]): ParseAttemptResult {
  const candidate = extractJsonObject(rawResponse) ?? stripMarkdownFences(rawResponse);
  const parseCandidates = Array.from(new Set([candidate, repairJsonLikeResponse(candidate)]));
  let lastReason = 'json_parse_error';

  for (const parseCandidate of parseCandidates) {
    try {
      const parsed = JSON.parse(parseCandidate) as {
        d?: unknown;
        c?: unknown;
        f?: Array<{
          s?: unknown;
          l?: unknown;
          v?: unknown;
        }>;
      };
      const normalizedConfidence = typeof parsed.c === 'string' ? normalizeEnumValue(parsed.c) : parsed.c;

      if (typeof parsed.d !== 'string') {
        lastReason = 'missing_dominant_language';
        continue;
      }

      if (!Array.isArray(parsed.f)) {
        lastReason = 'missing_flagged_regions_array';
        continue;
      }

      if (normalizedConfidence !== 'high' && normalizedConfidence !== 'medium' && normalizedConfidence !== 'low') {
        lastReason = 'invalid_confidence_value';
        continue;
      }

      const flaggedRegions: FlaggedRegion[] = [];

      for (const item of parsed.f) {
        const sampleNumber = parseSampleNumber(item.s);
        const normalizedSeverity = typeof item.v === 'string' ? normalizeEnumValue(item.v) : item.v;

        if (
          sampleNumber === null ||
          typeof item.l !== 'string' ||
          (normalizedSeverity !== 'high' && normalizedSeverity !== 'medium' && normalizedSeverity !== 'low')
        ) {
          lastReason = sampleNumber === null ? 'invalid_sample_number_reference' : 'invalid_flagged_region_entry';
          flaggedRegions.length = 0;
          break;
        }

        const sample = samples[sampleNumber - 1];

        if (sample === undefined) {
          lastReason = 'invalid_sample_number_reference';
          flaggedRegions.length = 0;
          break;
        }

        flaggedRegions.push({
          sampleNumber,
          region: sample.region,
          text: sample.text,
          detectedLanguage: item.l,
          severity: normalizedSeverity
        });
      }

      if (parsed.f.length !== flaggedRegions.length) {
        continue;
      }

      return {
        parsed: {
          dominantLanguage: parsed.d,
          flaggedRegions,
          confidence: normalizedConfidence
        },
        reason: parseCandidate === candidate ? 'ok' : 'ok_after_repair',
        candidate: parseCandidate
      };
    } catch (error) {
      lastReason = error instanceof Error ? `json_parse_error:${error.message}` : 'json_parse_error';
    }
  }

  return {
    parsed: null,
    reason: lastReason,
    candidate: parseCandidates[parseCandidates.length - 1] ?? candidate
  };
}

export function tryParseLLMResponse(rawResponse: string, samples: TextSample[] = []): ParseAttemptResult {
  const candidate = extractJsonObject(rawResponse) ?? stripMarkdownFences(rawResponse);
  const parseCandidates = Array.from(new Set([candidate, repairJsonLikeResponse(candidate)]));
  let lastReason = 'json_parse_error';

  for (const parseCandidate of parseCandidates) {
    try {
      const parsed = JSON.parse(parseCandidate) as Partial<ParsedLlmResponse> & {
        flaggedRegions?: Array<
          Partial<FlaggedRegion> & {
            sampleNumber?: number | string;
          }
        >;
      };
      const normalizedConfidence =
        typeof parsed.confidence === 'string' ? normalizeEnumValue(parsed.confidence) : parsed.confidence;

      if (typeof parsed.dominantLanguage !== 'string') {
        lastReason = 'missing_dominant_language';
        continue;
      }

      if (!Array.isArray(parsed.flaggedRegions)) {
        lastReason = 'missing_flagged_regions_array';
        continue;
      }

      if (normalizedConfidence !== 'high' && normalizedConfidence !== 'medium' && normalizedConfidence !== 'low') {
        lastReason = 'invalid_confidence_value';
        continue;
      }

      const normalizationResult = mapStructuredFlaggedRegions(parsed.flaggedRegions, samples);

      if (normalizationResult.reason !== null) {
        lastReason = normalizationResult.reason;
        continue;
      }

      return {
        parsed: {
          dominantLanguage: parsed.dominantLanguage,
          flaggedRegions: normalizationResult.flaggedRegions,
          confidence: normalizedConfidence
        },
        reason: parseCandidate === candidate ? 'ok' : 'ok_after_repair',
        candidate: parseCandidate
      };
    } catch (error) {
      lastReason = error instanceof Error ? `json_parse_error:${error.message}` : 'json_parse_error';
    }
  }

  return {
    parsed: null,
    reason: lastReason,
    candidate: parseCandidates[parseCandidates.length - 1] ?? candidate
  };
}

export function parseLLMResponse(rawResponse: string): ParsedLlmResponse | null {
  return tryParseLLMResponse(rawResponse).parsed;
}
